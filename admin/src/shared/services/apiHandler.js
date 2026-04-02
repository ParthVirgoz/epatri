export const handleApi = async (apiCall) => {
  try {
    const { data } = await apiCall;
    return [data, null];
  } catch (error) {
    const message =
      error.response?.data?.message || "Something went wrong";

    return [null, message];
  }
};