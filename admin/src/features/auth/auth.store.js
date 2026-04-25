import { create } from "zustand";
import { getMeApi } from "./auth.api";
import { apiClient } from "../../shared/services/apiClient";

const ACCESS_TOKEN_KEY = "access_token";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "access_token_expires_at";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
}

function isTokenExpired() {
  const expiresAtRaw = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  if (!expiresAtRaw) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() > expiresAt;
}

function persistTokenWith24h(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(Date.now() + TWENTY_FOUR_HOURS_MS));
}

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem(ACCESS_TOKEN_KEY),
  isAuthenticated: false,
  loading: true,

  initAuth: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!token) {
      set({ loading: false });
      return;
    }
    if (isTokenExpired()) {
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return;
    }

    try {
      const { data } = await apiClient.get("/auth/me");
      set({
        user: data,
        token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      // Only clear auth if token is truly invalid/expired/forbidden.
      if (status === 401 || status === 403) {
        clearAuthStorage();
        set({ user: null, token: null, isAuthenticated: false, loading: false });
        return;
      }
      // Keep existing token for transient/network/server failures.
      set({ loading: false });
    }
  },

  login: (data) => {
    persistTokenWith24h(data.access_token);

    set({
      user: data.user,
      token: data.access_token,
      isAuthenticated: true,
    });
  },

  /** Load full profile (shop_username, etc.) after login — Supabase user alone may lack profile fields. */
  refreshUser: async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    if (isTokenExpired()) {
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    const [data, error] = await getMeApi();
    if (!error && data) {
      set({ user: data });
    }
  },

  logout: () => {
    clearAuthStorage();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));