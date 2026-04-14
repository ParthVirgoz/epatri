import { apiClient } from "../../shared/services/apiClient";
import { handleApi } from "../../shared/services/apiHandler";
import { encodePasswordsInBody } from "../../utils/passwordEncrypt";

export const loginApi = (payload) =>
  handleApi(apiClient.post("/auth/login", encodePasswordsInBody(payload)));

export const registerApi = (payload) =>
  handleApi(apiClient.post("/auth/register", encodePasswordsInBody(payload)));

export const getMeApi = () =>
  handleApi(apiClient.get("/auth/me"));