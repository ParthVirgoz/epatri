import { apiClient } from "../../shared/services/apiClient";
import { handleApi } from "../../shared/services/apiHandler";

export const loginApi = (payload) =>
  handleApi(apiClient.post("/auth/login", payload));

export const registerApi = (payload) =>
  handleApi(apiClient.post("/auth/register", payload));

export const getMeApi = () =>
  handleApi(apiClient.get("/auth/me"));