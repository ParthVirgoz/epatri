import { apiClient } from "../../../shared/services/apiClient";
import { handleApi } from "../../../shared/services/apiHandler";

export const getMyMenuStudioApi = () => handleApi(apiClient.get("/menu/mine"));
export const putDraftMenuStudioApi = (body) => handleApi(apiClient.put("/menu/draft", body));
export const publishDraftMenuStudioApi = () => handleApi(apiClient.post("/menu/publish"));

export const uploadMenuApi = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return handleApi(apiClient.post("/menu/upload", formData));
};

export const updateDigitalMenuApi = (digital_menu, menu_id) =>
    handleApi(apiClient.put("/menu/digital", { digital_menu, menu_id }));

export const listMenusForLocationApi = (locationId) =>
    handleApi(apiClient.get(`/menu/locations/${encodeURIComponent(locationId)}/menus`));

export const createMenuForLocationApi = (locationId, body) =>
    handleApi(apiClient.post(`/menu/locations/${encodeURIComponent(locationId)}/menus`, body));

export const createMenuGroupApi = (locationId, body) =>
  handleApi(apiClient.post(`/menu/locations/${encodeURIComponent(locationId)}/menu-groups`, body));

export const deleteMenuGroupApi = (groupId) =>
  handleApi(apiClient.delete(`/menu/menu-groups/${encodeURIComponent(groupId)}`));

export const deleteMenuVersionApi = (menuId) =>
  handleApi(apiClient.delete(`/menu/versions/${encodeURIComponent(menuId)}`));

export const patchMenuApi = (menuId, body) =>
    handleApi(apiClient.patch(`/menu/${encodeURIComponent(menuId)}`, body));

export const getMenuSchedulesApi = (menuId) =>
    handleApi(apiClient.get(`/menu/${encodeURIComponent(menuId)}/schedules`));

export const putMenuSchedulesApi = (menuId, schedules) =>
    handleApi(apiClient.put(`/menu/${encodeURIComponent(menuId)}/schedules`, { schedules }));

export const listMyLocationsApi = () =>
    handleApi(apiClient.get("/business/me/locations"));

export const createMyLocationApi = (body) =>
    handleApi(apiClient.post("/business/me/locations", body));

export const deleteMyLocationApi = (locationId) =>
  handleApi(apiClient.delete(`/business/me/locations/${encodeURIComponent(locationId)}`));

export const setupOnboardingApi = (body) =>
    handleApi(apiClient.post("/business/onboarding/setup", body));

export const checkOnboardingSlugAvailabilityApi = (slug) =>
    handleApi(apiClient.get(`/business/onboarding/slug-availability?slug=${encodeURIComponent(String(slug || "").trim())}`));

export const searchOnboardingPlacesApi = (q) =>
  handleApi(
    apiClient.get(`/business/onboarding/place-search?q=${encodeURIComponent(String(q || "").trim())}`)
  );

export const getMasterMenuApi = () => handleApi(apiClient.get("/business/me/master-menu"));

export const ensureMasterMenuApi = () => handleApi(apiClient.post("/business/me/master-menu/ensure"));

export const patchLocationFollowMasterApi = (locationId, follows_business_master_menu) =>
  handleApi(
    apiClient.patch(`/business/me/locations/${encodeURIComponent(locationId)}/follow-master`, {
      follows_business_master_menu,
    })
  );
