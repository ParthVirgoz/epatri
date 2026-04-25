import { toFriendlyApiError } from "../../messages/userFacing.js";

export const handleApi = async (apiCall) => {
  try {
    const { data } = await apiCall;
    return [data, null];
  } catch (error) {
    const status = error.response?.status ?? 0;
    const serverMessage =
      error.response?.data?.message ??
      error.response?.data?.error ??
      (typeof error.response?.data === "string" ? error.response.data : null);

    const raw =
      serverMessage ||
      (error.message ? `${error.message}` : null) ||
      "";

    const friendly = toFriendlyApiError(raw, status);
    return [null, friendly];
  }
};
