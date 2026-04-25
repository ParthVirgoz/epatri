import { getLocationById, isPlatformAdmin } from '../../services/tenantScope.service.js';
import { canManageBusinessWideMenus } from '../menu/menu.admin.service.js';
import { businessThemeUpsertPayload } from '../../utils/businessTheme.js';

function makeError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const MIN_BUSINESS_SLUG_LENGTH = 5;
const BUSINESS_SLUG_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  'epatri-backend/1.0 (onboarding place search; configure NOMINATIM_USER_AGENT)';

function isMissingColumnError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('column') || msg.includes('schema cache');
}

function isMissingTableError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache');
}

async function upsertBusinessThemeAndPrefsFromOnboarding(fastify, businessId, rawTheme) {
  const { error: pErr } = await fastify.supabaseAdmin.from('business_preferences').upsert(
    {
      business_id: businessId,
      menu_mode: 'mvp',
      enable_multi_outlet: false,
      enable_schedules: false,
      session_hours: 24,
    },
    { onConflict: 'business_id' },
  );
  if (pErr && !isMissingTableError(pErr)) throw new Error(pErr.message);

  if (!rawTheme || typeof rawTheme !== 'object') return;
  const { error: tErr } = await fastify.supabaseAdmin.from('business_themes').upsert(
    businessThemeUpsertPayload(businessId, rawTheme),
    { onConflict: 'business_id' },
  );
  if (tErr && !isMissingTableError(tErr)) throw new Error(tErr.message);
}

function parseOptionalLocationGeo(payload) {
  const lat = payload?.latitude;
  const lng = payload?.longitude;
  const rawAddr = payload?.address_text != null ? String(payload.address_text).trim() : '';
  const address_text = rawAddr.length > 0 ? rawAddr.slice(0, 2000) : null;

  if (lat == null && lng == null) {
    return { latitude: null, longitude: null, address_text };
  }
  if (lat == null || lng == null) {
    throw makeError('latitude and longitude must both be provided or both omitted', 400);
  }
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    throw makeError('Invalid coordinates', 400);
  }
  if (la < -90 || la > 90 || ln < -180 || ln > 180) {
    throw makeError('Coordinates out of range', 400);
  }
  return { latitude: la, longitude: ln, address_text };
}

function parseRequiredLocationGeo(payload, label = 'Location') {
  const geo = parseOptionalLocationGeo(payload);
  if (geo.latitude == null || geo.longitude == null) {
    throw makeError(`${label}: latitude and longitude are required`, 400);
  }
  if (!geo.address_text) {
    throw makeError(`${label}: landmark/address is required`, 400);
  }
  return geo;
}

function normalizeLocationPair(name, address) {
  return `${String(name || '').trim().toLowerCase()}::${String(address || '').trim().toLowerCase()}`;
}

function stripLocationGeo(r) {
  const { latitude: _la, longitude: _lo, address_text: _ad, ...rest } = r;
  return rest;
}

function stripLocationFollows(r) {
  const { follows_business_master_menu: _f, ...rest } = r;
  return rest;
}

/**
 * Server-side proxy for OpenStreetMap Nominatim (browser-safe, proper User-Agent).
 */
export async function searchPlacesForOnboarding(fastify, query) {
  const q = String(query || '').trim();
  if (q.length < 3) return { results: [] };
  if (q.length > 200) throw makeError('Search query too long', 400);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      throw makeError('Place search service unavailable', 502);
    }
    const json = await res.json();
    if (!Array.isArray(json)) return { results: [] };
    const results = json
      .map((r) => ({
        label: String(r.display_name || ''),
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      }))
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    return { results };
  } catch (e) {
    clearTimeout(t);
    if (e?.statusCode) throw e;
    if (e?.name === 'AbortError') throw makeError('Search timed out', 504);
    throw makeError('Place search failed', 502);
  }
}

function normalizeBusinessSlug(input) {
  return String(input || '').trim().toLowerCase();
}

export async function checkBusinessSlugAvailability(fastify, userId, payload) {
  const existing = await getMyBusiness(fastify, userId);
  if (existing) {
    throw makeError('Business already exists. You can manage details from Menu page.', 409);
  }

  const slug = normalizeBusinessSlug(payload?.slug || '');
  if (!slug) {
    return {
      slug,
      available: false,
      message: 'Business slug is required.',
    };
  }
  if (!BUSINESS_SLUG_RE.test(slug)) {
    return {
      slug,
      available: false,
      message: 'Use only letters, numbers, dash (-), underscore (_), or period (.), and do not end with ., _, or -.',
    };
  }
  if (slug.length < MIN_BUSINESS_SLUG_LENGTH) {
    return {
      slug,
      available: false,
      message: `Use at least ${MIN_BUSINESS_SLUG_LENGTH} letters or numbers.`,
    };
  }

  const { data: takenBusiness } = await fastify.supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const available = !takenBusiness;
  return {
    slug,
    available,
    message: available ? 'Available' : 'This username is already taken.',
  };
}

async function tryInsertOwnerMembership(fastify, userId, businessId) {
  const { error } = await fastify.supabaseAdmin
    .from('memberships')
    .insert({
      user_id: userId,
      business_id: businessId,
      location_id: null,
      role_key: 'owner',
      status: 'active',
    });
  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('duplicate')) return;
    throw new Error(error.message);
  }
}

async function getMyBusiness(fastify, userId) {
  const { data: profile } = await fastify.supabaseAdmin
    .from('profiles')
    .select('business_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.business_id) {
    const { data: biz } = await fastify.supabaseAdmin
      .from('businesses')
      .select('id, owner_user_id, name, slug, is_multi_outlet')
      .eq('id', profile.business_id)
      .maybeSingle();
    if (biz) return biz;
  }

  const { data: owned } = await fastify.supabaseAdmin
    .from('businesses')
    .select('id, owner_user_id, name, slug, is_multi_outlet')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return owned || null;
}

export async function listMyBusinessLocations(fastify, userId) {
  const business = await getMyBusiness(fastify, userId);
  if (!business) throw makeError('Business not found', 404);

  const allowed =
    business.owner_user_id === userId ||
    (await isPlatformAdmin(fastify, userId)) ||
    (await canManageBusinessWideMenus(fastify, userId, business.id));
  if (!allowed) throw makeError('Forbidden', 403);

  const selectWithGeo =
    'id, name, slug, area_label, is_primary, has_published_menu, business_id, follows_business_master_menu, latitude, longitude, address_text';
  const selectNoGeo =
    'id, name, slug, area_label, is_primary, has_published_menu, business_id, follows_business_master_menu';
  const selectMinimal = 'id, name, slug, area_label, is_primary, has_published_menu, business_id';

  let { data, error } = await fastify.supabaseAdmin
    .from('locations')
    .select(selectWithGeo)
    .eq('business_id', business.id)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await fastify.supabaseAdmin
      .from('locations')
      .select(selectNoGeo)
      .eq('business_id', business.id)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true }));
    data = (data || []).map((row) => ({
      ...row,
      latitude: null,
      longitude: null,
      address_text: null,
    }));
  }

  if (
    error &&
    String(error.message || '')
      .toLowerCase()
      .includes('follows_business_master_menu')
  ) {
    ({ data, error } = await fastify.supabaseAdmin
      .from('locations')
      .select(selectMinimal)
      .eq('business_id', business.id)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true }));
    data = (data || []).map((row) => ({
      ...row,
      follows_business_master_menu: false,
      latitude: null,
      longitude: null,
      address_text: null,
    }));
  }

  if (error) throw new Error(error.message);
  return { business, locations: data || [] };
}

export async function createLocationForMyBusiness(fastify, userId, payload) {
  const business = await getMyBusiness(fastify, userId);
  if (!business) throw makeError('Business not found', 404);

  const allowed =
    business.owner_user_id === userId ||
    (await isPlatformAdmin(fastify, userId)) ||
    (await canManageBusinessWideMenus(fastify, userId, business.id));
  if (!allowed) throw makeError('Forbidden', 403);

  const name = String(payload?.name || '').trim();
  if (!name) throw makeError('Location name is required', 400);

  const proposedSlug = slugify(payload?.slug || name);
  if (!proposedSlug) throw makeError('Valid slug is required', 400);

  const { data: existing } = await fastify.supabaseAdmin
    .from('locations')
    .select('id')
    .eq('business_id', business.id)
    .eq('slug', proposedSlug)
    .maybeSingle();

  if (existing) throw makeError('This outlet slug already exists', 409);

  const followsMaster = Boolean(business.is_multi_outlet);
  const geo = parseRequiredLocationGeo(payload || {}, 'Location');

  let { data: samePair, error: pairErr } = await fastify.supabaseAdmin
    .from('locations')
    .select('id, name, address_text')
    .eq('business_id', business.id);

  if (pairErr && isMissingColumnError(pairErr)) {
    throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
  }
  if (pairErr) throw new Error(pairErr.message);

  const newKey = normalizeLocationPair(name, geo.address_text);
  if ((samePair || []).some((r) => normalizeLocationPair(r.name, r.address_text) === newKey)) {
    throw makeError('Outlet name + landmark must be unique for this business.', 409);
  }

  const row = {
    business_id: business.id,
    name,
    slug: proposedSlug,
    area_label: payload?.area_label ? String(payload.area_label).trim() : null,
    is_primary: false,
    has_published_menu: false,
    follows_business_master_menu: followsMaster,
    latitude: geo.latitude,
    longitude: geo.longitude,
    address_text: geo.address_text,
  };

  let working = row;
  let { data, error } = await fastify.supabaseAdmin
    .from('locations')
    .insert(working)
    .select(
      'id, name, slug, area_label, is_primary, has_published_menu, business_id, follows_business_master_menu, latitude, longitude, address_text'
    )
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
  }

  if (
    error &&
    String(error.message || '')
      .toLowerCase()
      .includes('follows_business_master_menu')
  ) {
    working = stripLocationFollows(working);
    ({ data, error } = await fastify.supabaseAdmin
      .from('locations')
      .insert(working)
      .select(
        'id, name, slug, area_label, is_primary, has_published_menu, business_id, latitude, longitude, address_text'
      )
      .maybeSingle());
    if (data) data = { ...data, follows_business_master_menu: false };
  }

  if (error && isMissingColumnError(error)) {
    throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
  }

  if (error) throw new Error(error.message);

  await fastify.supabaseAdmin
    .from('businesses')
    .update({ is_multi_outlet: true })
    .eq('id', business.id)
    .neq('is_multi_outlet', true);

  return { business_id: business.id, location: data };
}

export async function setupOnboardingForMyBusiness(fastify, userId, payload) {
  const existing = await getMyBusiness(fastify, userId);
  if (existing) {
    throw makeError('Business already exists. You can add outlets from Menu page.', 409);
  }

  const businessName = String(payload?.business_name || '').trim();
  const businessSlug = normalizeBusinessSlug(payload?.business_slug || '');
  const isMultiOutlet = Boolean(payload?.is_multi_outlet);
  const primaryLocationName = String(payload?.primary_location_name || 'Main Outlet').trim();
  const primaryLocationArea = payload?.primary_location_area
    ? String(payload.primary_location_area).trim()
    : null;
  const primaryGeo = parseRequiredLocationGeo(
    {
    latitude: payload?.primary_location_latitude,
    longitude: payload?.primary_location_longitude,
    address_text: payload?.primary_location_address_text,
    },
    'Primary outlet'
  );
  const additionalRaw = Array.isArray(payload?.additional_locations) ? payload.additional_locations : [];

  if (!businessName) throw makeError('Business name is required', 400);
  if (!businessSlug) throw makeError('Business slug is required', 400);
  if (!BUSINESS_SLUG_RE.test(businessSlug)) {
    throw makeError('Business slug can only contain letters, numbers, dash (-), underscore (_), and period (.), and cannot end with ., _, or -.', 400);
  }
  if (businessSlug.length < MIN_BUSINESS_SLUG_LENGTH) {
    throw makeError(`Business slug must be at least ${MIN_BUSINESS_SLUG_LENGTH} characters`, 400);
  }
  if (!primaryLocationName) throw makeError('Primary outlet name is required', 400);

  if (!isMultiOutlet && additionalRaw.length > 0) {
    throw makeError('Single-outlet setup cannot include extra outlets. Choose multiple outlets or remove extras.', 400);
  }
  if (isMultiOutlet) {
    const namedExtrasCount = additionalRaw.filter((r) => String(r?.name || '').trim().length > 0).length;
    if (namedExtrasCount < 1) {
      throw makeError('Multiple outlets requires at least one additional outlet.', 400);
    }
  }

  const uniquePairs = new Set();
  const primaryPairKey = normalizeLocationPair(primaryLocationName, primaryGeo.address_text);
  uniquePairs.add(primaryPairKey);

  const { data: slugTaken } = await fastify.supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('slug', businessSlug)
    .maybeSingle();
  if (slugTaken) throw makeError('Business slug already taken', 409);

  const { data: business, error: bizErr } = await fastify.supabaseAdmin
    .from('businesses')
    .insert({
      owner_user_id: userId,
      name: businessName,
      slug: businessSlug,
      is_multi_outlet: isMultiOutlet,
    })
    .select('id, owner_user_id, name, slug, is_multi_outlet')
    .maybeSingle();
  if (bizErr) {
    const raw = String(bizErr.message || '').toLowerCase();
    const code = String(bizErr.code || '');
    if (
      code === '23505' ||
      (raw.includes('duplicate') && raw.includes('slug')) ||
      raw.includes('businesses_slug_key')
    ) {
      throw makeError('Business slug already taken', 409);
    }
    throw new Error(bizErr.message);
  }
  if (!business) throw new Error('Could not create business');

  const primaryRow = {
    business_id: business.id,
    name: primaryLocationName,
    slug: 'main',
    area_label: primaryLocationArea,
    is_primary: true,
    has_published_menu: false,
    follows_business_master_menu: isMultiOutlet,
    latitude: primaryGeo.latitude,
    longitude: primaryGeo.longitude,
    address_text: primaryGeo.address_text,
  };

  let workingPrimary = primaryRow;
  let { data: location, error: locErr } = await fastify.supabaseAdmin
    .from('locations')
    .insert(workingPrimary)
    .select('id, business_id, name, slug, is_primary, area_label, latitude, longitude, address_text')
    .maybeSingle();

  if (locErr && isMissingColumnError(locErr)) {
    throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
  }

  if (locErr && String(locErr.message || '').toLowerCase().includes('follows_business_master_menu')) {
    workingPrimary = stripLocationFollows(workingPrimary);
    ({ data: location, error: locErr } = await fastify.supabaseAdmin
      .from('locations')
      .insert(workingPrimary)
      .select('id, business_id, name, slug, is_primary, area_label, latitude, longitude, address_text')
      .maybeSingle());
  }

  if (locErr && isMissingColumnError(locErr)) {
    throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
  }

  if (locErr || !location) throw new Error(locErr?.message || 'Could not create primary outlet');

  const createdExtras = [];
  if (isMultiOutlet && additionalRaw.length > 0) {
    const usedSlugs = new Set(['main']);
    for (const row of additionalRaw) {
      const name = String(row?.name || '').trim();
      if (!name) continue;
      const areaLabel = row?.area_label ? String(row.area_label).trim() : null;
      let locSlug = slugify(row?.slug || name);
      if (!locSlug) continue;
      const baseSlug = locSlug;
      let n = 0;
      while (usedSlugs.has(locSlug)) {
        n += 1;
        locSlug = `${baseSlug}-${n}`;
      }
      usedSlugs.add(locSlug);

      const exGeo = parseRequiredLocationGeo(row || {}, `Outlet ${name}`);
      const pairKey = normalizeLocationPair(name, exGeo.address_text);
      if (uniquePairs.has(pairKey)) {
        throw makeError(
          'Outlet name + landmark must be unique. If outlet names are same, landmark must be different.',
          409
        );
      }
      uniquePairs.add(pairKey);
      const extraRow = {
        business_id: business.id,
        name,
        slug: locSlug,
        area_label: areaLabel,
        is_primary: false,
        has_published_menu: false,
        follows_business_master_menu: true,
        latitude: exGeo.latitude,
        longitude: exGeo.longitude,
        address_text: exGeo.address_text,
      };

      let workingExtra = extraRow;
      let { data: extraLoc, error: exErr } = await fastify.supabaseAdmin
        .from('locations')
        .insert(workingExtra)
        .select('id, business_id, name, slug, is_primary, area_label, latitude, longitude, address_text')
        .maybeSingle();

      if (exErr && isMissingColumnError(exErr)) {
        throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
      }

      if (exErr && String(exErr.message || '').toLowerCase().includes('follows_business_master_menu')) {
        workingExtra = stripLocationFollows(workingExtra);
        ({ data: extraLoc, error: exErr } = await fastify.supabaseAdmin
          .from('locations')
          .insert(workingExtra)
          .select('id, business_id, name, slug, is_primary, area_label, latitude, longitude, address_text')
          .maybeSingle());
      }

      if (exErr && isMissingColumnError(exErr)) {
        throw makeError('Database migration required: run docs/v2_8_location_coordinates.sql on Supabase.', 503);
      }

      if (exErr || !extraLoc) throw new Error(exErr?.message || 'Could not create outlet');
      createdExtras.push(extraLoc);
    }
  }

  const { error: profileErr } = await fastify.supabaseAdmin
    .from('profiles')
    .update({
      shop_name: businessName,
      shop_username: businessSlug,
      business_id: business.id,
      primary_location_id: location.id,
    })
    .eq('id', userId);
  if (profileErr) throw new Error(profileErr.message);

  await tryInsertOwnerMembership(fastify, userId, business.id);

  await upsertBusinessThemeAndPrefsFromOnboarding(fastify, business.id, payload?.interactive_theme);

  return { business, location, additional_locations: createdExtras };
}

async function assertCanManageBusiness(fastify, userId, business) {
  if (!business) throw makeError('Business not found', 404);
  const allowed =
    business.owner_user_id === userId ||
    (await isPlatformAdmin(fastify, userId)) ||
    (await canManageBusinessWideMenus(fastify, userId, business.id));
  if (!allowed) throw makeError('Forbidden', 403);
}

export async function getMasterMenuForMyBusiness(fastify, userId) {
  const business = await getMyBusiness(fastify, userId);
  if (!business) return { menu: null };
  await assertCanManageBusiness(fastify, userId, business);

  let { data, error } = await fastify.supabaseAdmin
    .from('menus')
    .select('id, title, status, sort_order, pdf_url, digital_menu, is_default, business_id, location_id')
    .eq('business_id', business.id)
    .eq('is_business_master', true)
    .maybeSingle();

  if (error && String(error.message || '').toLowerCase().includes('is_business_master')) {
    ({ data, error } = await fastify.supabaseAdmin
      .from('menus')
      .select('id, title, status, sort_order, pdf_url, digital_menu, is_default, business_id, location_id')
      .eq('business_id', business.id)
      .is('location_id', null)
      .eq('title', 'Company menu')
      .maybeSingle());
  }

  if (error) throw new Error(error.message);
  return { menu: data };
}

export async function ensureMasterMenuForMyBusiness(fastify, userId) {
  const existing = await getMasterMenuForMyBusiness(fastify, userId);
  if (existing.menu) return existing;

  const business = await getMyBusiness(fastify, userId);
  if (!business) throw makeError('Business not found', 404);
  await assertCanManageBusiness(fastify, userId, business);

  const row = {
    user_id: userId,
    business_id: business.id,
    location_id: null,
    is_business_master: true,
    title: 'Company menu',
    status: 'draft',
    digital_menu: {},
    pdf_url: '',
    is_default: true,
    sort_order: 0,
  };

  let { data, error } = await fastify.supabaseAdmin
    .from('menus')
    .insert(row)
    .select('id, title, status, sort_order, pdf_url, digital_menu, is_default, business_id, location_id')
    .maybeSingle();

  if (error && String(error.message || '').toLowerCase().includes('is_business_master')) {
    const { is_business_master: _m, ...rowMinimal } = row;
    ({ data, error } = await fastify.supabaseAdmin
      .from('menus')
      .insert(rowMinimal)
      .select('id, title, status, sort_order, pdf_url, digital_menu, is_default, business_id, location_id')
      .maybeSingle());
  }

  if (error) throw new Error(error.message);
  return { menu: data };
}

export async function deleteLocationForMyBusiness(fastify, userId, locationId) {
  const business = await getMyBusiness(fastify, userId);
  if (!business) throw makeError('Business not found', 404);
  await assertCanManageBusiness(fastify, userId, business);

  const { data: all, error: listErr } = await fastify.supabaseAdmin
    .from('locations')
    .select('id, is_primary, name')
    .eq('business_id', business.id)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (listErr) throw new Error(listErr.message);
  const rows = all || [];
  if (rows.length <= 1) {
    throw makeError('You must keep at least one outlet.', 400);
  }

  const target = rows.find((r) => r.id === locationId);
  if (!target) throw makeError('Location not found', 404);

  const replacement = rows.find((r) => r.id !== locationId);
  if (!replacement) throw makeError('Location not found', 404);

  if (target.is_primary) {
    const { error: primErr } = await fastify.supabaseAdmin
      .from('locations')
      .update({ is_primary: true })
      .eq('id', replacement.id);
    if (primErr) throw new Error(primErr.message);
  }

  const { error: profErr } = await fastify.supabaseAdmin
    .from('profiles')
    .update({ primary_location_id: replacement.id })
    .eq('primary_location_id', locationId);
  if (profErr) throw new Error(profErr.message);

  // Hard-delete outlet-linked menu data before deleting the outlet itself.
  const { data: menuRows, error: menuListErr } = await fastify.supabaseAdmin
    .from('menus')
    .select('id')
    .eq('business_id', business.id)
    .eq('location_id', locationId);
  if (menuListErr && !isMissingTableError(menuListErr)) throw new Error(menuListErr.message);
  const menuIds = (menuRows || []).map((m) => m.id).filter(Boolean);

  if (menuIds.length > 0) {
    let schedDelErr = null;
    {
      let q = fastify.supabaseAdmin.from('menu_schedules').delete().in('menu_id', menuIds);
      const { error } = await q;
      schedDelErr = error || null;
    }
    if (schedDelErr && !isMissingTableError(schedDelErr)) {
      // Fallback for schema variants where schedules are keyed by location_id.
      const { error: fallbackErr } = await fastify.supabaseAdmin
        .from('menu_schedules')
        .delete()
        .eq('location_id', locationId);
      if (fallbackErr && !isMissingTableError(fallbackErr)) throw new Error(fallbackErr.message);
    }
  }

  const { error: grpDelErr } = await fastify.supabaseAdmin
    .from('menu_groups')
    .delete()
    .eq('location_id', locationId);
  if (grpDelErr && !isMissingTableError(grpDelErr)) throw new Error(grpDelErr.message);

  const { error: menuDelErr } = await fastify.supabaseAdmin
    .from('menus')
    .delete()
    .eq('business_id', business.id)
    .eq('location_id', locationId);
  if (menuDelErr && !isMissingTableError(menuDelErr)) throw new Error(menuDelErr.message);

  const { error: deleteAuditErr } = await fastify.supabaseAdmin.from('menu_publication_log').insert({
    business_id: business.id,
    location_id: locationId,
    draft_snapshot_id: null,
    published_snapshot_id: null,
    published_by: userId,
    event: {
      action: 'outlet_deleted',
      location_name: target?.name || null,
    },
  });
  if (deleteAuditErr && !isMissingTableError(deleteAuditErr)) throw new Error(deleteAuditErr.message);

  const { error: snapshotsErr } = await fastify.supabaseAdmin
    .from('menu_snapshots')
    .delete()
    .eq('business_id', business.id)
    .eq('location_id', locationId);
  if (snapshotsErr && !isMissingTableError(snapshotsErr)) throw new Error(snapshotsErr.message);

  const { error: delErr } = await fastify.supabaseAdmin
    .from('locations')
    .delete()
    .eq('id', locationId)
    .eq('business_id', business.id);

  if (delErr) throw new Error(delErr.message);

  if (rows.length === 2) {
    await fastify.supabaseAdmin.from('businesses').update({ is_multi_outlet: false }).eq('id', business.id);
  }

  return { deleted_id: locationId };
}

export async function patchLocationFollowMasterForMyBusiness(fastify, userId, locationId, follows) {
  const business = await getMyBusiness(fastify, userId);
  if (!business) throw makeError('Business not found', 404);
  await assertCanManageBusiness(fastify, userId, business);

  const loc = await getLocationById(fastify, locationId);
  if (!loc || loc.business_id !== business.id) {
    throw makeError('Location not found', 404);
  }

  let { data, error } = await fastify.supabaseAdmin
    .from('locations')
    .update({ follows_business_master_menu: Boolean(follows) })
    .eq('id', locationId)
    .select(
      'id, name, slug, area_label, is_primary, has_published_menu, business_id, follows_business_master_menu'
    )
    .maybeSingle();

  if (
    error &&
    String(error.message || '')
      .toLowerCase()
      .includes('follows_business_master_menu')
  ) {
    throw makeError(
      'Database migration required: run docs/v2_4_master_menu_location_follow.sql on Supabase.',
      503
    );
  }

  if (error) throw new Error(error.message);
  return { location: data };
}
