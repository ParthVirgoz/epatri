/**
 * Guest-facing menu page URL (frontend / Astro), not the raw PDF URL.
 * Used for copy / share — same link customers use.
 *
 * @param {object} user - Auth user with business_slug or shop_username
 * @param {{ locationSlug?: string | null }} [options]
 *   When `locationSlug` is set (outlet selected), URL is `/business/outletSlug`.
 *   Otherwise `/business` only (company menu or no outlet segment).
 */
export function getPublicMenuUrl(user, options = {}) {
  const base =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_MENU_BASE_URL?.replace(/\/$/, "")) || "";

  const segment = user?.business_slug || user?.shop_username;
  if (!segment) {
    return { url: null, ok: false, reason: "no_username" };
  }
  if (!base) {
    return { url: null, ok: false, reason: "no_base" };
  }

  const slug = options.locationSlug != null ? String(options.locationSlug).trim() : "";
  let path = `${base}/${encodeURIComponent(segment)}`;
  if (slug) {
    path += `/${encodeURIComponent(slug)}`;
  }

  return {
    url: path,
    ok: true,
    reason: null,
  };
}

/** Display host + path without protocol (Linktree-style pill). */
export function formatPublicUrlForDisplay(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const p = u.pathname.replace(/\/$/, "") || "/";
    return `${u.hostname}${p}`;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}
