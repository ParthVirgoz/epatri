/** Single source of truth for menu limits (used by validation + services). */

export const MAX_MENU_TITLE_LENGTH = 120;
export const MAX_VERSIONS_PER_MENU = 3; // 1 public/live + archived history + 1 working draft
export const MAX_DRAFT_VERSIONS_PER_MENU = 1;
export const MAX_MENU_GROUPS_PER_LOCATION = 3;
export const MAX_SCHEDULE_RULES_PER_MENU_GROUP = 20;
export const MAX_PDF_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB, matches admin copy

export const MAX_DIGITAL_CATEGORIES = 80;
export const MAX_DIGITAL_ITEMS_PER_CATEGORY = 150;
export const MAX_DIGITAL_NAME_LENGTH = 200;
export const MAX_DIGITAL_DESCRIPTION_LENGTH = 2000;
export const MAX_DIGITAL_PRICE_LENGTH = 50;

/** Legacy: menus without menu_group_id (pre–v2_6) — cap rows per location. */
export const MAX_LEGACY_MENUS_PER_LOCATION = 30;
