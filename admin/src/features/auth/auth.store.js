import { create } from "zustand";
import { getMeApi } from "./auth.api";
import { apiClient } from "../../shared/services/apiClient";
import {
  clearAuthStorage,
  getAccessToken,
  isAdminSessionExpired,
  persistSessionFromLogin,
  ensureSessionDeadlineIfMissing,
  ACCESS_TOKEN_KEY,
} from "./auth.storage";
export const useAuthStore = create((set) => ({
  user: null,
  token: typeof localStorage !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null,
  isAuthenticated: false,
  loading: true,

  initAuth: async () => {
    const token = getAccessToken();

    if (!token) {
      set({ loading: false });
      return;
    }
    if (isAdminSessionExpired()) {
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return;
    }

    const applyUser = (userData, activeToken) => {
      ensureSessionDeadlineIfMissing();
      set({
        user: userData,
        token: activeToken,
        isAuthenticated: true,
        loading: false,
      });
    };

    try {
      const { data } = await apiClient.get("/auth/me");
      applyUser(data, getAccessToken());
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      if (status === 401 || status === 403) {
        clearAuthStorage();
        set({ user: null, token: null, isAuthenticated: false, loading: false });
        return;
      }
      set({ loading: false });
    }
  },

  login: (data) => {
    persistSessionFromLogin({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    set({
      user: data.user,
      token: data.access_token,
      isAuthenticated: true,
    });
  },

  /** Load full profile (shop_username, etc.) after login — Supabase user alone may lack profile fields. */
  refreshUser: async () => {
    const token = getAccessToken();
    if (!token) return;
    if (isAdminSessionExpired()) {
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    const [data, error] = await getMeApi();
    if (!error && data) {
      ensureSessionDeadlineIfMissing();
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
