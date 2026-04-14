import { create } from "zustand";
import { getMeApi } from "./auth.api";

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  isAuthenticated: false,
  loading: true,

  initAuth: async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      set({ loading: false });
      return;
    }

    const [data, error] = await getMeApi();

    if (error) {
      localStorage.removeItem("access_token");
      set({ user: null, isAuthenticated: false, loading: false });
    } else {
      set({
        user: data,
        isAuthenticated: true,
        loading: false,
      });
    }
  },

  login: (data) => {
    localStorage.setItem("access_token", data.access_token);

    set({
      user: data.user,
      token: data.access_token,
      isAuthenticated: true,
    });
  },

  /** Load full profile (shop_username, etc.) after login — Supabase user alone may lack profile fields. */
  refreshUser: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const [data, error] = await getMeApi();
    if (!error && data) {
      set({ user: data });
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));