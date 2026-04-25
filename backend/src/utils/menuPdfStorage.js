const MENUS_BUCKET = "menus";

/**
 * TTL (seconds) for signed URLs to menu PDFs in the `menus` storage bucket.
 * Keep guest iframes working; refresh page gets a new URL from the API.
 */
export function menuPdfSignedUrlTtlSec() {
  const n = Number(process.env.MENU_PDF_SIGNED_URL_TTL_SEC);
  if (Number.isFinite(n) && n >= 60 && n <= 60 * 60 * 24) return Math.floor(n);
  return 3600;
}

/**
 * If `pdfUrl` is a Supabase Storage object in bucket `menus` (public URL or bucket-relative path),
 * return a time-limited signed URL. Otherwise return the original string (external PDF URL).
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string | null | undefined} pdfUrl
 * @returns {Promise<string | null>}
 */
export async function signMenuPdfUrlIfStorable(fastify, pdfUrl) {
  const raw = String(pdfUrl || "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    const pathFromSupabase = extractMenusObjectPathFromUrl(raw);
    if (!pathFromSupabase) return raw;
    return await createSignedUrlForPath(fastify, pathFromSupabase);
  }

  const relative = raw.replace(/^\/+/, "");
  if (!relative) return null;
  return await createSignedUrlForPath(fastify, relative);
}

/**
 * @param {string} absoluteUrl
 * @returns {string | null} object path inside `menus` bucket
 */
export function extractMenusObjectPathFromUrl(absoluteUrl) {
  const u = String(absoluteUrl || "");
  const m = u.match(/\/object\/(?:public|sign|authenticated)\/menus\/([^?#]+)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

async function createSignedUrlForPath(fastify, objectPath) {
  const ttl = menuPdfSignedUrlTtlSec();
  const { data, error } = await fastify.supabaseAdmin.storage
    .from(MENUS_BUCKET)
    .createSignedUrl(objectPath, ttl);
  if (error) {
    fastify.log?.warn?.(`[menuPdf] createSignedUrl failed for ${objectPath}: ${error.message}`);
    return null;
  }
  return data?.signedUrl || null;
}
