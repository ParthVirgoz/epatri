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

/** Bumps on login/logout so in-flight `initAuth` cannot clear a newer session or leave `loading` stuck. */
let authHydrationEpoch = 0;

export const useAuthStore = create((set) => ({
  user: null,
  token: typeof localStorage !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null,
  isAuthenticated: false,
  loading: true,

  initAuth: async () => {
    const myEpoch = ++authHydrationEpoch;
    const token = getAccessToken();

    if (!token) {
      if (myEpoch === authHydrationEpoch) set({ loading: false });
      return;
    }
    if (isAdminSessionExpired()) {
      if (myEpoch !== authHydrationEpoch) return;
      clearAuthStorage();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return;
    }

    const applyUser = (userData, activeToken) => {
      if (myEpoch !== authHydrationEpoch) return;
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
      if (myEpoch !== authHydrationEpoch) return;
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
    authHydrationEpoch += 1;
    persistSessionFromLogin({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    set({
      user: data.user,
      token: data.access_token,
      isAuthenticated: true,
      loading: false,
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
    authHydrationEpoch += 1;
    clearAuthStorage();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  },
}));
