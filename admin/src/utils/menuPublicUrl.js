/**
 * Guest-facing menu page URL (frontend / Astro), not the raw PDF URL.
 * Used for copy / share — same link as Profile.
 */
export function getPublicMenuUrl(user) {
  const base =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_MENU_BASE_URL?.replace(/\/$/, "")) || "";

  if (!user?.shop_username) {
    return { url: null, ok: false, reason: "no_username" };
  }
  if (!base) {
    return { url: null, ok: false, reason: "no_base" };
  }

  return {
    url: `${base}/${encodeURIComponent(user.shop_username)}`,
    ok: true,
    reason: null,
  };
}
