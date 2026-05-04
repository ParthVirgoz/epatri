import axios from "axios";
import {
  clearAuthStorage,
  getRefreshToken,
  isAdminSessionExpired,
  persistTokensAfterRefresh,
} from "./auth.storage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

let refreshPromise = null;

async function performRefresh() {
  if (isAdminSessionExpired()) {
    clearAuthStorage();
    throw new Error("Session expired");
  }
  const rt = getRefreshToken();
  if (!rt) {
    clearAuthStorage();
    throw new Error("Missing refresh token");
  }
  try {
    const { data } = await axios.post(
      `${baseURL}/auth/refresh`,
      { refresh_token: rt },
      { headers: { "Content-Type": "application/json" } },
    );
    if (!data?.access_token || !data?.refresh_token) {
      clearAuthStorage();
      throw new Error("Invalid refresh response");
    }
    persistTokensAfterRefresh(data.access_token, data.refresh_token);
    return data;
  } catch (e) {
    clearAuthStorage();
    throw e;
  }
}

/**
 * Refreshes Supabase access token using the stored refresh token.
 * Concurrent callers share one in-flight refresh.
 */
export function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
