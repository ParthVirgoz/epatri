export const handleApi = async (apiCall) => {
  try {
    const { data } = await apiCall;
    return [data, null];
  } catch (error) {
    const status = error.response?.status;
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data ||
      null;

    const message =
      serverMessage ||
      (error.message ? `${error.message}` : null) ||
      "Something went wrong";

    const humanMessage =
      status && serverMessage
        ? `Error ${status}: ${message}`
        : status
        ? `Error ${status}: ${message}`
        : message;

    return [null, humanMessage];
  }
};