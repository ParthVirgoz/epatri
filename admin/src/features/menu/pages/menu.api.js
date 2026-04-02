import { apiClient } from "../../../shared/services/apiClient";
import { handleApi } from "../../../shared/services/apiHandler";

export const uploadMenuApi = (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return handleApi(
        apiClient.post("/menu/upload", formData)
    );
};