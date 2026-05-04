import axios from "axios";
import { getAccessToken, getRefreshToken, isAdminSessionExpired } from "../../features/auth/auth.storage";
import { refreshSessionOnce } from "../../features/auth/auth.refresh";
import { emitSessionInvalid } from "../../features/auth/auth.sessionEvents";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
});

export default apiClient;

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;
    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/register")) {
      return Promise.reject(error);
    }
    if (originalRequest._authRefreshAttempted) {
      return Promise.reject(error);
    }
    if (isAdminSessionExpired() || !getRefreshToken()) {
      emitSessionInvalid();
      return Promise.reject(error);
    }

    originalRequest._authRefreshAttempted = true;

    try {
      await refreshSessionOnce();
    } catch {
      emitSessionInvalid();
      return Promise.reject(error);
    }

    const next = getAccessToken();
    if (next && originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${next}`;
    }
    return apiClient(originalRequest);
  },
);