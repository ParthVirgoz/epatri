/**
 * Admin auth persistence in localStorage — session-only keys cleared on logout or expiry.
 * Business profile (logo, preferences) lives on the server, not here.
 */

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const SESSION_DEADLINE_AT_KEY = "session_deadline_at";

/** Absolute admin browser session length from first successful session bind (login or legacy bootstrap). */
export const SESSION_MAX_MS = 6 * 60 * 60 * 1000;

const LEGACY_ACCESS_TOKEN_EXPIRES_AT_KEY = "access_token_expires_at";
const LEGACY_PROFILE_AVATAR_KEY = "epatri_profile_avatar_dataurl_v1";

function removeLegacyKeys() {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_EXPIRES_AT_KEY);
    localStorage.removeItem(LEGACY_PROFILE_AVATAR_KEY);
  } catch {
    void 0;
  }
}

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function isAdminSessionExpired() {
  try {
    const raw = localStorage.getItem(SESSION_DEADLINE_AT_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    return Date.now() > t;
  } catch {
    return false;
  }
}

/** One-time migration: old installs had JWT-only; start a 6h cap from first successful auth after upgrade. */
export function ensureSessionDeadlineIfMissing() {
  try {
    if (!localStorage.getItem(SESSION_DEADLINE_AT_KEY) && localStorage.getItem(ACCESS_TOKEN_KEY)) {
      localStorage.setItem(SESSION_DEADLINE_AT_KEY, String(Date.now() + SESSION_MAX_MS));
    }
  } catch {
    void 0;
  }
}

export function clearAuthStorage() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_DEADLINE_AT_KEY);
    removeLegacyKeys();
  } catch {
    void 0;
  }
}

export function persistSessionFromLogin({ access_token: accessToken, refresh_token: refreshToken }) {
  if (!accessToken) return;
  try {
    removeLegacyKeys();
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    localStorage.setItem(SESSION_DEADLINE_AT_KEY, String(Date.now() + SESSION_MAX_MS));
  } catch {
    void 0;
  }
}

export function persistTokensAfterRefresh(accessToken, refreshToken) {
  if (!accessToken || !refreshToken) return;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    void 0;
  }
}
