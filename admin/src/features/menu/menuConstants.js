/**
 * Mirrors backend/src/modules/menu/menu.constants.js for UX and client-side checks.
 * The API remains the source of truth; these limits prevent obvious mistakes before submit.
 */

export const MAX_MENU_TITLE_LENGTH = 120;
export const MAX_VERSIONS_PER_MENU = 3;
export const MAX_DRAFT_VERSIONS_PER_MENU = 1;
export const MAX_MENU_GROUPS_PER_LOCATION = 3;
export const MAX_SCHEDULE_RULES_PER_MENU_GROUP = 20;
export const MAX_PDF_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MAX_DIGITAL_CATEGORIES = 80;
export const MAX_DIGITAL_ITEMS_PER_CATEGORY = 150;
export const MAX_DIGITAL_NAME_LENGTH = 200;
export const MAX_DIGITAL_DESCRIPTION_LENGTH = 2000;
export const MAX_DIGITAL_PRICE_LENGTH = 50;
