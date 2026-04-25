import { apiClient } from "../../shared/services/apiClient";
import { handleApi } from "../../shared/services/apiHandler";
import { encodePasswordsInBody } from "../../utils/passwordEncrypt";

export const loginApi = (payload) =>
  handleApi(apiClient.post("/auth/login", encodePasswordsInBody(payload)));

export const registerApi = (payload) =>
  handleApi(apiClient.post("/auth/register", encodePasswordsInBody(payload)));

export const forgotPasswordApi = (payload) =>
  handleApi(apiClient.post("/auth/forgot-password", payload));

export const resetPasswordApi = (payload) =>
  handleApi(apiClient.post("/auth/reset-password", encodePasswordsInBody(payload)));

export const getMeApi = () =>
  handleApi(apiClient.get("/auth/me"));

export const updateMeApi = (payload) =>
  handleApi(apiClient.patch("/auth/me", payload));

/** Read current counters (no side effects). */
export const getTreeImpactApi = () =>
  handleApi(apiClient.get("/public/impact/trees"));

/** Increments either `saved` or `given` by 1–10 (single counter per call); returns latest values. */
export const bumpTreeImpactApi = (source = "auth") =>
  handleApi(apiClient.post("/public/impact/trees", { source }));