import { env } from '../../config/env.js';
import { listMembershipsForUser } from '../../services/tenantScope.service.js';
import { signMenuPdfUrlIfStorable } from '../../utils/menuPdfStorage.js';
import { businessThemeUpsertPayload, normalizeInteractiveTheme } from '../../utils/businessTheme.js';

const SHOP_USERNAME_RE = /^[a-z0-9-]+$/;

function sanitizeShopUsernameSegment(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function localPartFromEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at < 1) return '';
  let local = e.slice(0, at);
  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);
  return local;
}

function normalizePreferences(raw) {
  const base = {
    mode: 'basic',
    enableMultiMenu: false,
    enableSchedules: false,
    interactiveTheme: normalizeInteractiveTheme(null),
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const out = { ...base, ...raw };
  out.mode = out.mode === 'advanced' ? 'advanced' : 'basic';
  out.enableMultiMenu = Boolean(out.enableMultiMenu);
  out.enableSchedules = Boolean(out.enableSchedules);
  const theme = raw.interactiveTheme && typeof raw.interactiveTheme === 'object' ? raw.interactiveTheme : {};
  out.interactiveTheme = normalizeInteractiveTheme(theme);
  if (out.mode !== 'advanced') {
    out.enableMultiMenu = false;
    out.enableSchedules = false;
  }
  return out;
}

function isMissingRelationError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

/**
 * After v3 MVP reset, menu content lives in `menu_snapshots`. Falls back to legacy `menus` when the new
 * tables are not present.
 */
async function loadMenuFieldsForProfile(fastify, userId, profile, primaryBusinessId) {
  let pdf_url = null;
  let digital_menu = {};
  let menu_id = null;
  const db = fastify.supabaseAdmin;

  let businessId = primaryBusinessId || null;
  let locationId = profile.primary_location_id || null;

  if (businessId && !locationId) {
    const { data: loc, error: locErr } = await db
      .from("locations")
      .select("id")
      .eq("business_id", businessId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (locErr && !isMissingRelationError(locErr)) {
      fastify.log.warn("[getCurrentUser] locations lookup failed", locErr.message);
    }
    locationId = loc?.id || null;
  }

  if (businessId && locationId) {
    const readSnap = (state) =>
      db
        .from("menu_snapshots")
        .select("id, menu_type, pdf_url, digital_menu")
        .eq("business_id", businessId)
        .eq("location_id", locationId)
        .eq("state", state)
        .maybeSingle();

    const pub = await readSnap("published");
    if (pub.error) {
      if (!isMissingRelationError(pub.error)) {
        fastify.log.warn("[getCurrentUser] menu_snapshots published failed", pub.error.message);
        return { menu_id, pdf_url, digital_menu };
      }
    } else {
      let row = pub.data;
      if (!row) {
        const d = await readSnap("draft");
        if (d.error && !isMissingRelationError(d.error)) {
          fastify.log.warn("[getCurrentUser] menu_snapshots draft failed", d.error.message);
          return { menu_id, pdf_url, digital_menu };
        }
        row = d.data;
      }
      if (row) {
        menu_id = row.id ?? null;
        if (row.menu_type === "pdf") {
          pdf_url = row.pdf_url ?? null;
          digital_menu = {};
        } else {
          pdf_url = null;
          digital_menu = row.digital_menu ?? {};
        }
      }
      return { menu_id, pdf_url, digital_menu };
    }
  }

  let menuRes = { data: null, error: null };
  if (profile.primary_location_id) {
    menuRes = await fastify.supabaseAdmin
      .from("menus")
      .select("id, pdf_url, digital_menu")
      .eq("location_id", profile.primary_location_id)
      .eq("is_default", true)
      .maybeSingle();
  }
  if (!menuRes.data) {
    menuRes = await fastify.supabaseAdmin
      .from("menus")
      .select("id, pdf_url, digital_menu")
      .eq("user_id", userId)
      .maybeSingle();
  }

  if (menuRes.error) {
    if (isMissingRelationError(menuRes.error)) {
      return { menu_id, pdf_url, digital_menu };
    }
    const msg = String(menuRes.error.message || "");
    if (msg.includes("digital_menu")) {
      const fallback = await fastify.supabaseAdmin
        .from("menus")
        .select("pdf_url")
        .eq("user_id", userId)
        .maybeSingle();
      pdf_url = fallback.data?.pdf_url ?? null;
      digital_menu = {};
    } else {
      fastify.log.warn("[getCurrentUser] menu select failed", menuRes.error);
    }
  } else if (menuRes.data) {
    menu_id = menuRes.data.id ?? null;
    pdf_url = menuRes.data.pdf_url ?? null;
    digital_menu = menuRes.data.digital_menu ?? {};
  }

  return { menu_id, pdf_url, digital_menu };
}

/** Default public username when none sent at signup: email local-part, sanitized to a-z0-9- (min 3). */
function defaultShopUsernameFromEmail(email, userId) {
  const baseRaw = sanitizeShopUsernameSegment(localPartFromEmail(email));
  let base = baseRaw;
  if (!base || base.length < 3) {
    const hex = String(userId || '').replace(/-/g, '');
    base = `u${hex.slice(0, 7)}`;
  }
  if (base.length > 32) base = base.slice(0, 32);
  if (!SHOP_USERNAME_RE.test(base) || base.length < 3) {
    const hex = String(userId || '').replace(/-/g, '');
    base = `u${hex.slice(0, 7)}`;
  }
  return base;
}

async function pickUniqueShopUsername(fastify, email, userId) {
  const base = defaultShopUsernameFromEmail(email, userId);
  for (let n = 0; n < 200; n += 1) {
    const suffix = n === 0 ? '' : `-${n}`;
    const maxBase = 32 - suffix.length;
    const candidate = (base.slice(0, Math.max(0, maxBase)) + suffix).slice(0, 32);
    if (!SHOP_USERNAME_RE.test(candidate) || candidate.length < 3) continue;

    const { data: existing } = await fastify.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('shop_username', candidate)
      .maybeSingle();

    if (!existing) return candidate;
  }
  const hex = String(userId || '').replace(/-/g, '');
  return `u${hex}`.slice(0, 32);
}

export async function registerUser(fastify, data) {
  const { email, password } = data;
  const requestedUsername = String(data.shop_username || '').trim().toLowerCase();
  const shop_name = String(data.shop_name || '').trim();
  const phone = String(data.phone || '').trim();

  if (requestedUsername) {
    const { data: existing } = await fastify.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('shop_username', requestedUsername)
      .maybeSingle();

    if (existing) {
      throw new Error('Shop username already taken');
    }
  }

  const { data: authData, error } = await fastify.supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: phone ? { phone } : undefined,
  });

  if (error) throw new Error(error.message);

  const user = authData.user;
  /** Prefer email from created auth user (source of truth) for local-part username. */
  const emailForUsername = String(user.email || email || '')
    .trim()
    .toLowerCase();
  const shop_username =
    requestedUsername || (await pickUniqueShopUsername(fastify, emailForUsername, user.id));

  const profileInsert = {
    id: user.id,
    role: 'branch_admin',
    shop_username,
  };
  if (shop_name) profileInsert.shop_name = shop_name;

  const { data: profileRow } = await fastify.supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileRow) {
    const { error: updErr } = await fastify.supabaseAdmin
      .from('profiles')
      .update({
        shop_username,
        role: 'branch_admin',
        ...(shop_name ? { shop_name } : {}),
      })
      .eq('id', user.id);
    if (updErr) throw new Error(updErr.message);
  } else {
    const { error: insErr } = await fastify.supabaseAdmin.from('profiles').insert(profileInsert);
    if (insErr) throw new Error(insErr.message);
  }

  return { message: 'Account created successfully' };
}

export async function loginUser(fastify, data) {
  const { email, password } = data;
  fastify.log.info('[loginUser] attempt', { email });

  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  try {
    const { data: loginData, error } =
      await fastify.supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      fastify.log.error('[loginUser] supabase login error', error);
      const err = new Error(error.message || 'Login failed');
      err.status = 401;
      throw err;
    }

    if (!loginData?.session || !loginData?.user) {
      const err = new Error('Login failed: invalid credentials or session');
      err.status = 401;
      throw err;
    }

    return {
      access_token: loginData.session.access_token,
      expires_in: 60 * 60 * 24,
      user: loginData.user,
    };
  } catch (err) {
    fastify.log.error('[loginUser] exception', err);
    throw err;
  }
}

export async function getCurrentUser(fastify, user) {
  let preferences = normalizePreferences(null);
  try {
    const { data: authUserData, error: authErr } = await fastify.supabaseAdmin.auth.admin.getUserById(user.id);
    if (!authErr && authUserData?.user?.user_metadata?.app_preferences) {
      preferences = normalizePreferences(authUserData.user.user_metadata.app_preferences);
    }
  } catch {
    // keep defaults; user metadata is best-effort only
  }

  const { data: profile, error } = await fastify.supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  const { data: ownedBusinesses } = await fastify.supabaseAdmin
    .from("businesses")
    .select("id, name, slug, is_multi_outlet")
    .eq("owner_user_id", user.id);

  const primaryBusinessId = profile.business_id || ownedBusinesses?.[0]?.id || null;

  const { menu_id, pdf_url, digital_menu } = await loadMenuFieldsForProfile(
    fastify,
    user.id,
    profile,
    primaryBusinessId,
  );

  let pdf_url_out = pdf_url;
  if (pdf_url_out) {
    const signed = await signMenuPdfUrlIfStorable(fastify, pdf_url_out);
    if (signed) pdf_url_out = signed;
  }

  let business_slug = profile.shop_username;
  if (primaryBusinessId) {
    const { data: biz } = await fastify.supabaseAdmin
      .from("businesses")
      .select("slug")
      .eq("id", primaryBusinessId)
      .maybeSingle();
    if (biz?.slug) {
      business_slug = biz.slug;
    }
  }

  let memberships = [];
  try {
    memberships = await listMembershipsForUser(fastify, user.id);
  } catch (e) {
    fastify.log.warn("[getCurrentUser] memberships load failed", e?.message);
  }

  let accessible_locations = [];
  if (primaryBusinessId) {
    let { data: locs, error: locErr } = await fastify.supabaseAdmin
      .from("locations")
      .select("id, name, slug, business_id, is_primary, follows_business_master_menu, area_label")
      .eq("business_id", primaryBusinessId)
      .order("is_primary", { ascending: false });
    if (
      locErr &&
      String(locErr.message || "")
        .toLowerCase()
        .includes("follows_business_master_menu")
    ) {
      ({ data: locs } = await fastify.supabaseAdmin
        .from("locations")
        .select("id, name, slug, business_id, is_primary, area_label")
        .eq("business_id", primaryBusinessId)
        .order("is_primary", { ascending: false }));
      locs = (locs || []).map((r) => ({ ...r, follows_business_master_menu: false }));
    }
    accessible_locations = locs || [];
  } else if (profile.primary_location_id) {
    let { data: one, error: oneErr } = await fastify.supabaseAdmin
      .from("locations")
      .select("id, name, slug, business_id, is_primary, follows_business_master_menu, area_label")
      .eq("id", profile.primary_location_id)
      .maybeSingle();
    if (
      oneErr &&
      String(oneErr.message || "")
        .toLowerCase()
        .includes("follows_business_master_menu")
    ) {
      ({ data: one } = await fastify.supabaseAdmin
        .from("locations")
        .select("id, name, slug, business_id, is_primary, area_label")
        .eq("id", profile.primary_location_id)
        .maybeSingle());
      if (one) one.follows_business_master_menu = false;
    }
    if (one) accessible_locations = [one];
  }

  return {
    ...profile,
    pdf_url: pdf_url_out,
    digital_menu,
    menu_id,
    business_slug,
    memberships,
    owned_businesses: ownedBusinesses || [],
    accessible_locations,
    current_context: {
      business_id: primaryBusinessId,
      primary_location_id: profile.primary_location_id ?? null,
    },
    preferences,
  };
}

export async function updateCurrentUser(fastify, user, payload) {
  const patch = {};
  if (payload?.shop_name !== undefined) {
    patch.shop_name = String(payload.shop_name || "").trim().slice(0, 120);
  }
  if (payload?.shop_logo_data_url !== undefined) {
    const raw = payload.shop_logo_data_url;
    if (raw === null) {
      patch.shop_logo_data_url = null;
    } else {
      patch.shop_logo_data_url = String(raw);
    }
  }
  if (Object.keys(patch).length === 0) {
    // still allow preferences-only updates below
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await fastify.supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  }

  // Guest frontend title uses `businesses.name` (see public.service businessPublicPayload).
  // Keep it in sync when the owner updates display name on profile.
  if (payload?.shop_name !== undefined && patch.shop_name) {
    const displayName = patch.shop_name;
    const { data: profRow, error: profErr } = await fastify.supabaseAdmin
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      fastify.log.warn("[updateCurrentUser] could not load profile for business name sync", profErr.message);
    } else {
      let businessId = profRow?.business_id ?? null;
      if (!businessId) {
        const { data: owned } = await fastify.supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("owner_user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        businessId = owned?.id ?? null;
      }
      if (businessId) {
        const { error: bErr } = await fastify.supabaseAdmin
          .from("businesses")
          .update({ name: displayName })
          .eq("id", businessId);
        if (bErr) {
          fastify.log.warn("[updateCurrentUser] business name sync failed", bErr.message);
        }
      }
    }
  }

  if (payload?.preferences !== undefined) {
    const { data: authUserData, error: authErr } = await fastify.supabaseAdmin.auth.admin.getUserById(user.id);
    if (authErr) throw new Error(authErr.message);
    const currentMeta =
      authUserData?.user?.user_metadata && typeof authUserData.user.user_metadata === 'object'
        ? authUserData.user.user_metadata
        : {};
    const app_preferences = normalizePreferences(payload.preferences);
    const { error: updErr } = await fastify.supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMeta,
        app_preferences,
      },
    });
    if (updErr) throw new Error(updErr.message);

    // Keep business_themes in sync so public frontend (/public) reflects settings updates.
    try {
      const theme = app_preferences?.interactiveTheme || {};
      const { data: ownedBusiness } = await fastify.supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (ownedBusiness?.id) {
        const { error: tErr } = await fastify.supabaseAdmin.from('business_themes').upsert(
          businessThemeUpsertPayload(ownedBusiness.id, theme),
          { onConflict: 'business_id' },
        );
        if (tErr && !isMissingRelationError(tErr)) throw new Error(tErr.message);
      }
    } catch (themeSyncErr) {
      fastify.log.warn('[updateCurrentUser] theme sync skipped', themeSyncErr?.message || themeSyncErr);
    }
  }

  return await getCurrentUser(fastify, user);
}

export async function forgotPassword(fastify, email) {
  const redirectTo = env.PASSWORD_RESET_REDIRECT_URL
    ? String(env.PASSWORD_RESET_REDIRECT_URL).trim()
    : `${env.ADMIN_FRONTEND_URL.replace(/\/$/, '')}/reset-password`;
  const { error } = await fastify.supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw new Error(error.message);

  return { message: "Reset email sent" };
}

/** Body must include `password` and `access_token` from the Supabase recovery link (hash → SPA). */
export async function resetPassword(fastify, { password, access_token: accessToken }) {
  if (!password || !accessToken) {
    throw new Error('Password and access_token are required');
  }

  const { data: userData, error: userErr } = await fastify.supabase.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    const err = new Error('Invalid or expired recovery token');
    err.status = 401;
    throw err;
  }

  const { error } = await fastify.supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
    password,
  });

  if (error) throw new Error(error.message);

  return { message: "Password updated" };
}