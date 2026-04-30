import { mapBusinessThemeRow } from "../../utils/mapBusinessTheme.js";
import { signMenuPdfUrlIfStorable } from "../../utils/menuPdfStorage.js";

const TREE_COUNTER_DEFAULT = {
  saved: 0,
  given: 0,
  menus_created: 0,
  business_growth_percentage: 0,
  environment_saving_percentage: 0,
  area_coverage_count: 0,
};

function isMissingRelationError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

function isMissingColumnError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("column") || msg.includes("schema cache");
}

function hasDigitalContent(dm) {
  if (!dm || typeof dm !== "object") return false;
  const cats = dm.categories;
  if (Array.isArray(cats) && cats.length > 0) return true;
  const keys = Object.keys(dm).filter((k) => k !== "categories");
  return keys.length > 0;
}

async function businessPublicPayload(fastify, db, business) {
  let { data: locations, error: lErr } = await db
    .from("locations")
    .select("id, name, slug, area_label, is_primary, latitude, longitude, address_text")
    .eq("business_id", business.id)
    .order("is_primary", { ascending: false });

  if (lErr && isMissingColumnError(lErr)) {
    ({ data: locations, error: lErr } = await db
      .from("locations")
      .select("id, name, slug, area_label, is_primary")
      .eq("business_id", business.id)
      .order("is_primary", { ascending: false }));
    locations = (locations || []).map((row) => ({
      ...row,
      latitude: null,
      longitude: null,
      address_text: null,
    }));
  }

  if (lErr) throw lErr;

  const locList = locations || [];
  const enriched = [];

  for (const loc of locList) {
    let pdf_url = null;
    let digital_menu = {};
    let menu_id = null;
    let publishedType = "auto";

    try {
      const { data: published } = await db
        .from("menu_snapshots")
        .select("id, menu_type, pdf_url, digital_menu")
        .eq("business_id", business.id)
        .eq("location_id", loc.id)
        .eq("state", "published")
        .maybeSingle();
      if (published) {
        menu_id = published.id;
        publishedType = published.menu_type === "pdf" || published.menu_type === "interactive" ? published.menu_type : "auto";
        if (publishedType === "pdf") {
          pdf_url = published.pdf_url || null;
          digital_menu = {};
        } else {
          pdf_url = null;
          digital_menu = published.digital_menu ?? {};
        }
      }
    } catch {
      // Keep legacy fallback below for pre-MVP schema.
    }

    let pdf_url_for_guest = pdf_url;
    if (pdf_url_for_guest && publishedType === "pdf") {
      const signed = await signMenuPdfUrlIfStorable(fastify, pdf_url_for_guest);
      if (signed) pdf_url_for_guest = signed;
    }

    const has_menu = Boolean(pdf_url && String(pdf_url).trim()) || hasDigitalContent(digital_menu);
    const guest_menu_format = publishedType;
    enriched.push({
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      area_label: loc.area_label,
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
      address_text: loc.address_text ?? null,
      is_primary: loc.is_primary,
      business_id: business.id,
      location_id: loc.id,
      menu_id,
      pdf_url: pdf_url_for_guest,
      digital_menu,
      has_menu,
      guest_menu_format,
    });
  }

  enriched.sort((a, b) => {
    if (a.has_menu === b.has_menu) return String(a.name).localeCompare(String(b.name));
    return a.has_menu ? -1 : 1;
  });

  // Single-outlet brands (is_multi_outlet false) always open the menu on /{slug} even if legacy rows exist.
  const show_location_picker = false;

  const analytics_track_username = business.slug;

  let interactive_theme = null;
  try {
    const { data: themeRow, error: themeErr } = await db
      .from("business_themes")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle();
    if (!themeErr && themeRow) interactive_theme = mapBusinessThemeRow(themeRow);
  } catch {
    interactive_theme = null;
  }

  return {
    legacy: false,
    business_id: business.id,
    analytics_track_username,
    business_slug: business.slug,
    business_name: business.name,
    is_multi_outlet: business.is_multi_outlet,
    show_location_picker,
    interactive_theme,
    locations: enriched.slice(0, 1),
  };
}

/**
 * Public payload for `/{businessSlug}` — includes all locations for picker or single view.
 */
export async function getPublicBusinessBySlug(fastify, slug) {
  const db = fastify.supabaseAdmin;
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) {
    const err = new Error("Invalid slug");
    err.statusCode = 400;
    throw err;
  }

  const { data: business, error: bErr } = await db
    .from("businesses")
    .select("id, name, slug, is_multi_outlet, owner_user_id")
    .eq("slug", normalized)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!business) {
    const err = new Error("Business not found");
    err.statusCode = 404;
    throw err;
  }
  return await businessPublicPayload(fastify, db, business);
}

/**
 * Payload for `/{businessSlug}/{locationSlug}` — same as business + `current_location`.
 */
export async function getPublicLocationMenu(fastify, businessSlug, locationSlug) {
  const parent = await getPublicBusinessBySlug(fastify, businessSlug);
  const locSlug = String(locationSlug || "").trim().toLowerCase();
  const loc = parent.locations.find((l) => String(l.slug).toLowerCase() === locSlug);
  if (!loc) {
    const err = new Error("Location not found");
    err.statusCode = 404;
    throw err;
  }
  return { ...parent, current_location: loc };
}

function toCounterPayload(row) {
  const saved = Number(row?.trees_saved_count ?? TREE_COUNTER_DEFAULT.saved);
  const given = Number(row?.trees_given_count ?? TREE_COUNTER_DEFAULT.given);
  const menusCreated = Number(row?.menus_created_count ?? TREE_COUNTER_DEFAULT.menus_created);
  const businessGrowth = Number(
    row?.business_growth_percentage ?? TREE_COUNTER_DEFAULT.business_growth_percentage
  );
  const environmentSaving = Number(
    row?.environment_saving_percentage ?? TREE_COUNTER_DEFAULT.environment_saving_percentage
  );
  const areaCoverage = Number(row?.area_coverage_count ?? TREE_COUNTER_DEFAULT.area_coverage_count);
  return {
    saved: Math.max(TREE_COUNTER_DEFAULT.saved, Number.isFinite(saved) ? Math.floor(saved) : TREE_COUNTER_DEFAULT.saved),
    given: Math.max(TREE_COUNTER_DEFAULT.given, Number.isFinite(given) ? Math.floor(given) : TREE_COUNTER_DEFAULT.given),
    menus_created: Math.max(0, Number.isFinite(menusCreated) ? Math.floor(menusCreated) : TREE_COUNTER_DEFAULT.menus_created),
    business_growth_percentage: Number.isFinite(businessGrowth)
      ? Math.round(businessGrowth)
      : TREE_COUNTER_DEFAULT.business_growth_percentage,
    environment_saving_percentage: Math.max(
      0,
      Math.min(100, Number.isFinite(environmentSaving) ? Math.round(environmentSaving) : TREE_COUNTER_DEFAULT.environment_saving_percentage)
    ),
    area_coverage_count: Math.max(0, Number.isFinite(areaCoverage) ? Math.floor(areaCoverage) : TREE_COUNTER_DEFAULT.area_coverage_count),
  };
}

async function seedImpactCountersRow(db) {
  let seedErr = null;
  ({ error: seedErr } = await db.from("impact_counters").upsert(
    {
      key: "global",
      trees_saved_count: TREE_COUNTER_DEFAULT.saved,
      trees_given_count: TREE_COUNTER_DEFAULT.given,
      menus_created_count: TREE_COUNTER_DEFAULT.menus_created,
      business_growth_percentage: TREE_COUNTER_DEFAULT.business_growth_percentage,
      environment_saving_percentage: TREE_COUNTER_DEFAULT.environment_saving_percentage,
      area_coverage_count: TREE_COUNTER_DEFAULT.area_coverage_count,
    },
    // Important: do not overwrite existing counters; only create when missing.
    { onConflict: "key", ignoreDuplicates: true }
  ));

  // Backward compatibility for pre-migration schema without new columns.
  if (seedErr && isMissingColumnError(seedErr)) {
    ({ error: seedErr } = await db.from("impact_counters").upsert(
      {
        key: "global",
        trees_saved_count: TREE_COUNTER_DEFAULT.saved,
        trees_given_count: TREE_COUNTER_DEFAULT.given,
      },
      { onConflict: "key", ignoreDuplicates: true }
    ));
  }

  if (seedErr && !isMissingRelationError(seedErr)) throw seedErr;
}

/**
 * Read current tree impact counters (no increment). Use after a POST bump or for passive refresh.
 */
export async function getTreeImpactCounters(fastify) {
  const db = fastify.supabaseAdmin;
  await seedImpactCountersRow(db);

  let row = null;
  let rowErr = null;
  ({ data: row, error: rowErr } = await db
    .from("impact_counters")
    .select(
      "key, trees_saved_count, trees_given_count, menus_created_count, business_growth_percentage, environment_saving_percentage, area_coverage_count, last_bump_at"
    )
    .eq("key", "global")
    .maybeSingle());

  // Backward-compatible read for old schema before migration adds new columns.
  if (rowErr && isMissingColumnError(rowErr)) {
    ({ data: row, error: rowErr } = await db
      .from("impact_counters")
      .select("key, trees_saved_count, trees_given_count, last_bump_at")
      .eq("key", "global")
      .maybeSingle());
  }

  if (rowErr) {
    if (isMissingRelationError(rowErr)) {
      return toCounterPayload(null);
    }
    throw rowErr;
  }

  return row ? toCounterPayload(row) : toCounterPayload(null);
}

/**
 * Atomically increment **either** trees_saved **or** trees_given by a random 1–10 (never both in one call).
 * Optional body.source: "menu" | "auth" (for clients; stored only if you extend logging later).
 */
export async function bumpTreeImpactCounters(fastify, options = {}) {
  const db = fastify.supabaseAdmin;
  await seedImpactCountersRow(db);

  const source = String(options.source || "").toLowerCase();
  const minInc = source === "menu" ? 1 : 1;
  const maxInc = source === "menu" ? 5 : 10;
  const inc = minInc + Math.floor(Math.random() * (maxInc - minInc + 1));
  const bumpSaved = Math.random() < 0.5;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: row, error: rowErr } = await db
      .from("impact_counters")
      .select("key, trees_saved_count, trees_given_count, last_bump_at")
      .eq("key", "global")
      .maybeSingle();

    if (rowErr) {
      if (isMissingRelationError(rowErr)) {
        return {
          ...toCounterPayload(null),
          bumped: null,
        };
      }
      throw rowErr;
    }
    if (!row) {
      return {
        ...toCounterPayload(null),
        bumped: null,
      };
    }

    const saved0 = Number(row.trees_saved_count || 0);
    const given0 = Number(row.trees_given_count || 0);
    const lastAt = row.last_bump_at;

    const patch = bumpSaved
      ? {
          trees_saved_count: saved0 + inc,
          last_bump_at: new Date().toISOString(),
        }
      : {
          trees_given_count: given0 + inc,
          last_bump_at: new Date().toISOString(),
        };

    const { data: bumped, error: bumpErr } = await db
      .from("impact_counters")
      .update(patch)
      .eq("key", "global")
      .eq("last_bump_at", lastAt)
      .select("key, trees_saved_count, trees_given_count, last_bump_at")
      .maybeSingle();

    if (!bumpErr && bumped) {
      const latestCounters = await getTreeImpactCounters(fastify);
      return {
        ...latestCounters,
        bumped: bumpSaved ? "saved" : "given",
      };
    }
  }

  const fallback = await getTreeImpactCounters(fastify);
  return { ...fallback, bumped: null };
}
