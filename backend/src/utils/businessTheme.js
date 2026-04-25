/**
 * Interactive menu theme stored in `business_themes.theme` (JSONB).
 * Colors only — no per-menu font tuning (guest UI uses Inter).
 */

export const DEFAULT_INTERACTIVE_THEME = {
  surface: "#121316",
  surfaceTextColor: "#ffffff",
  brandNameColor: "#ffffff",
  itemsColor: "#ffffff",
  categoryColor: "#FF9423",
  priceColor: "#FF9423",
  menuCardColor: "#1c1e24",
  currencySymbol: "Rs.",
};

function hexOr(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? String(value) : fallback;
}

/** Map stored prefs / API payloads that still use older key names. */
function migrateOldThemeKeys(t) {
  if (!t || typeof t !== "object") return {};
  const out = { ...t };
  if (!out.surfaceTextColor && (out.bodyTextColor || out.surface_text_color)) {
    out.surfaceTextColor = out.bodyTextColor ?? out.surface_text_color;
  }
  if (!out.brandNameColor && out.accent) out.brandNameColor = out.accent;
  if (!out.brandNameColor && out.brand_name_color) out.brandNameColor = out.brand_name_color;
  if (!out.itemsColor && out.bodyTextColor) out.itemsColor = out.bodyTextColor;
  if (!out.itemsColor && out.items_color) out.itemsColor = out.items_color;
  if (!out.categoryColor && (out.categoryTextColor || out.category_text_color)) {
    out.categoryColor = out.categoryTextColor ?? out.category_text_color;
  }
  if (!out.priceColor && (out.priceTextColor || out.price_text_color)) {
    out.priceColor = out.priceTextColor ?? out.price_text_color;
  }
  if (!out.menuCardColor && (out.cardColor || out.menu_card_color)) {
    out.menuCardColor = out.cardColor ?? out.menu_card_color;
  }
  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function normalizeInteractiveTheme(raw) {
  const t = migrateOldThemeKeys(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
  const base = { ...DEFAULT_INTERACTIVE_THEME };
  return {
    surface: hexOr(t.surface, base.surface),
    surfaceTextColor: hexOr(t.surfaceTextColor, base.surfaceTextColor),
    brandNameColor: hexOr(t.brandNameColor, base.brandNameColor),
    itemsColor: hexOr(t.itemsColor, base.itemsColor),
    categoryColor: hexOr(t.categoryColor, base.categoryColor),
    priceColor: hexOr(t.priceColor, base.priceColor),
    menuCardColor: hexOr(t.menuCardColor, base.menuCardColor),
    currencySymbol: String(t.currencySymbol || base.currencySymbol)
      .trim()
      .slice(0, 6) || base.currencySymbol,
  };
}

/**
 * Map legacy `business_themes` row (many columns + custom json) to theme object.
 * @param {Record<string, unknown>} row
 */
export function themeFromLegacyBusinessThemeRow(row) {
  const custom = row.custom && typeof row.custom === "object" ? row.custom : {};
  const body = row.body_text_color;
  return normalizeInteractiveTheme({
    surface: row.surface_color,
    surfaceTextColor: body,
    brandNameColor: body,
    itemsColor: body,
    categoryColor: row.category_text_color,
    priceColor: row.price_text_color,
    menuCardColor: custom.card_color ?? custom.cardColor,
    currencySymbol: row.currency_symbol,
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {Record<string, unknown> | null}
 */
export function mapBusinessThemeFromDbRow(row) {
  if (!row || typeof row !== "object") return null;
  const themeCol = row.theme;
  if (themeCol && typeof themeCol === "object" && !Array.isArray(themeCol)) {
    if (Object.keys(themeCol).length > 0) {
      return normalizeInteractiveTheme(themeCol);
    }
    if (row.accent_color == null && row.surface_color == null && row.font_key == null) {
      return { ...DEFAULT_INTERACTIVE_THEME };
    }
  }
  if (row.accent_color != null || row.surface_color != null || row.font_key != null) {
    return themeFromLegacyBusinessThemeRow(row);
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} rawTheme
 */
export function interactiveThemeFromOnboardingInput(rawTheme) {
  if (!rawTheme || typeof rawTheme !== "object") return { ...DEFAULT_INTERACTIVE_THEME };
  return normalizeInteractiveTheme(rawTheme);
}

/**
 * @param {string} businessId
 * @param {Record<string, unknown> | null | undefined} rawTheme
 */
export function businessThemeUpsertPayload(businessId, rawTheme) {
  const theme = interactiveThemeFromOnboardingInput(rawTheme);
  return {
    business_id: businessId,
    theme,
  };
}
