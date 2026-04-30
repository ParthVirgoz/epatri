import { MAX_PDF_UPLOAD_BYTES } from "./menu.constants.js";
import { mapBusinessThemeRow } from "../../utils/mapBusinessTheme.js";
import { signMenuPdfUrlIfStorable } from "../../utils/menuPdfStorage.js";

function clientError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function isMissingRelationError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

async function resolveMyPrimaryLocation(fastify, userId) {
  const db = fastify.supabaseAdmin;
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("primary_location_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);

  let location = null;
  if (profile?.primary_location_id) {
    const { data: loc, error: locErr } = await db
      .from("locations")
      .select("id, business_id, name, slug")
      .eq("id", profile.primary_location_id)
      .maybeSingle();
    if (locErr) throw new Error(locErr.message);
    location = loc || null;
  }

  if (!location) {
    const { data: business, error: bErr } = await db
      .from("businesses")
      .select("id, name, slug")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!business) throw clientError("Business not found", 404);

    const { data: loc, error: lErr } = await db
      .from("locations")
      .select("id, business_id, name, slug")
      .eq("business_id", business.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!loc) throw clientError("Location not found", 404);
    location = loc;
  }

  const { data: business, error: bizErr } = await db
    .from("businesses")
    .select("id, name, slug")
    .eq("id", location.business_id)
    .maybeSingle();
  if (bizErr) throw new Error(bizErr.message);
  if (!business) throw clientError("Business not found", 404);

  return { business, location };
}

async function getSnapshot(db, businessId, locationId, state) {
  const { data, error } = await db
    .from("menu_snapshots")
    .select("*")
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .eq("state", state)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

async function deleteDraftSnapshot(db, businessId, locationId) {
  const { error } = await db
    .from("menu_snapshots")
    .delete()
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .eq("state", "draft");
  if (error) throw new Error(error.message);
}

function toMenuStatePayload(s) {
  if (!s) return null;
  return {
    id: s.id,
    state: s.state,
    menu_type: s.menu_type,
    title: s.title,
    pdf_url: s.pdf_url,
    digital_menu: s.digital_menu || {},
    metadata: s.metadata || {},
    published_at: s.published_at,
    updated_at: s.updated_at,
  };
}

async function toSignedMenuStatePayload(fastify, s) {
  const base = toMenuStatePayload(s);
  if (!base || base.menu_type !== "pdf" || !base.pdf_url) return base;
  const signed = await signMenuPdfUrlIfStorable(fastify, base.pdf_url);
  return { ...base, pdf_url: signed ?? base.pdf_url };
}

export async function getMyMenuStateMvp(fastify, userId) {
  const db = fastify.supabaseAdmin;
  const { business, location } = await resolveMyPrimaryLocation(fastify, userId);

  let published = null;
  try {
    published = await getSnapshot(db, business.id, location.id, "published");
  } catch (err) {
    if (isMissingRelationError(err)) {
      throw clientError("MVP menu tables are missing. Run the v3_0 reset migration first.", 500);
    }
    throw err;
  }

  const draftPending = false;

  let business_theme = null;
  try {
    const { data: tr, error: trErr } = await db
      .from("business_themes")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle();
    if (!trErr && tr) business_theme = mapBusinessThemeRow(tr);
  } catch {
    business_theme = null;
  }

  return {
    business,
    location,
    draft: null,
    published: await toSignedMenuStatePayload(fastify, published),
    active_type: published?.menu_type || null,
    draft_pending: draftPending,
    last_published_at: published?.published_at || null,
    business_theme,
  };
}

export async function upsertDraftMenuMvp(fastify, userId, body) {
  const db = fastify.supabaseAdmin;
  const { business, location } = await resolveMyPrimaryLocation(fastify, userId);

  const pdfRaw = body.menu_type === "pdf" ? String(body.pdf_url ?? "").trim() : "";
  const payload = {
    business_id: business.id,
    location_id: location.id,
    state: "published",
    menu_type: body.menu_type,
    title: body.title || "Menu",
    pdf_url: body.menu_type === "pdf" ? (pdfRaw.length > 0 ? pdfRaw : null) : null,
    digital_menu: body.menu_type === "interactive" ? body.digital_menu || {} : {},
    metadata: body.metadata || {},
    updated_by: userId,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("menu_snapshots").upsert(payload, {
    onConflict: "business_id,location_id,state",
  });
  if (error) throw new Error(error.message);
  await deleteDraftSnapshot(db, business.id, location.id);

  return await getMyMenuStateMvp(fastify, userId);
}

function hasInteractiveContent(dm) {
  const cats = dm?.categories;
  return Array.isArray(cats) && cats.length > 0;
}

export async function publishDraftMenuMvp(fastify, userId) {
  const db = fastify.supabaseAdmin;
  const { business, location } = await resolveMyPrimaryLocation(fastify, userId);
  const published = await getSnapshot(db, business.id, location.id, "published");
  if (!published) throw clientError("Create a menu first before publishing.", 400);

  if (published.menu_type === "pdf") {
    const u = String(published.pdf_url || "").trim();
    if (!u) throw clientError("Published PDF URL is missing. Upload a PDF and try again.", 400);
  } else if (published.menu_type === "interactive" && !hasInteractiveContent(published.digital_menu)) {
    throw clientError("Add at least one category to the interactive menu before publishing.", 400);
  }

  const nowIso = new Date().toISOString();
  const publishedPayload = {
    business_id: business.id,
    location_id: location.id,
    state: "published",
    menu_type: published.menu_type,
    title: published.title,
    pdf_url: published.menu_type === "pdf" ? published.pdf_url : null,
    digital_menu: published.menu_type === "interactive" ? published.digital_menu || {} : {},
    metadata: published.metadata || {},
    created_by: published.created_by || userId,
    updated_by: userId,
    published_at: nowIso,
    updated_at: nowIso,
  };

  const { data: publishedRow, error: pubErr } = await db
    .from("menu_snapshots")
    .upsert(publishedPayload, { onConflict: "business_id,location_id,state" })
    .select("*")
    .single();
  if (pubErr) throw new Error(pubErr.message);
  await deleteDraftSnapshot(db, business.id, location.id);

  const { error: logErr } = await db.from("menu_publication_log").insert({
    business_id: business.id,
    location_id: location.id,
    draft_snapshot_id: null,
    published_snapshot_id: publishedRow.id,
    published_by: userId,
    event: {
      action: "menu_published",
      menu_type: publishedRow.menu_type,
      title: publishedRow.title,
    },
  });
  if (logErr && !isMissingRelationError(logErr)) throw new Error(logErr.message);

  return await getMyMenuStateMvp(fastify, userId);
}

/**
 * Multipart PDF upload: stores file in Supabase storage and upserts draft as menu_type pdf.
 */
export async function uploadPdfDraftMvp(fastify, req) {
  const user = req.user;
  const db = fastify.supabaseAdmin;
  let fileBuffer = null;
  let mimetype = null;

  for await (const part of req.parts()) {
    if (part.type === "file" && part.fieldname === "file") {
      mimetype = part.mimetype;
      fileBuffer = await part.toBuffer();
    }
  }

  if (!fileBuffer) {
    const err = new Error("No file uploaded");
    err.statusCode = 400;
    throw err;
  }

  if (fileBuffer.length > MAX_PDF_UPLOAD_BYTES) {
    const err = new Error(`PDF must be at most ${Math.floor(MAX_PDF_UPLOAD_BYTES / (1024 * 1024))} MB`);
    err.statusCode = 400;
    throw err;
  }
  if (mimetype !== "application/pdf") {
    const err = new Error("Only PDF allowed");
    err.statusCode = 400;
    throw err;
  }

  const { business, location } = await resolveMyPrimaryLocation(fastify, user.id);
  const existingPublished = await getSnapshot(db, business.id, location.id, "published");
  const draftTitle =
    existingPublished?.title && String(existingPublished.title).trim() ? existingPublished.title : "Menu";

  const filePath = `${business.slug}/mvp-${location.id}.pdf`;
  const { error: uploadError } = await db.storage.from("menus").upload(filePath, fileBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  /** Bucket-relative path only; API returns time-limited signed URLs (private bucket safe). */
  const storagePath = filePath;

  const nowIso = new Date().toISOString();
  const payload = {
    business_id: business.id,
    location_id: location.id,
    state: "published",
    menu_type: "pdf",
    title: draftTitle,
    pdf_url: storagePath,
    digital_menu: {},
    metadata: {},
    updated_by: user.id,
    created_by: user.id,
    updated_at: nowIso,
  };

  const { error } = await db.from("menu_snapshots").upsert(payload, {
    onConflict: "business_id,location_id,state",
  });
  if (error) throw new Error(error.message);
  await deleteDraftSnapshot(db, business.id, location.id);

  return await getMyMenuStateMvp(fastify, user.id);
}
