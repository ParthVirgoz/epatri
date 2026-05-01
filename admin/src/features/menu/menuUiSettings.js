const SETTINGS_KEY = "epatri_menu_ui_settings_v1";
const AVATAR_KEY = "epatri_profile_avatar_dataurl_v1";

/**
 * Guest interactive menu: panel behind title, category headings, and item rows.
 * Intentionally fixed (not driven by theme) so list readability stays consistent.
 */
export const INTERACTIVE_MENU_PANEL_BG = "#1c1e24";

export const INTERACTIVE_THEME_DEFAULTS = {
  surface: "#121316",
  surfaceTextColor: "#ffffff",
  brandNameColor: "#ffffff",
  itemsColor: "#ffffff",
  categoryColor: "#FF9423",
  priceColor: "#FF9423",
  /** Kept in stored JSON for compatibility; guest UI always uses INTERACTIVE_MENU_PANEL_BG. */
  menuCardColor: INTERACTIVE_MENU_PANEL_BG,
  currencySymbol: "Rs.",
};

const DEFAULTS = {
  mode: "basic",
  enableMultiMenu: false,
  enableSchedules: false,
  interactiveTheme: { ...INTERACTIVE_THEME_DEFAULTS },
};

export function getMenuUiSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      interactiveTheme: {
        ...DEFAULTS.interactiveTheme,
        ...(parsed?.interactiveTheme || {}),
      },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMenuUiSettings(next) {
  const merged = {
    ...DEFAULTS,
    ...(next || {}),
    interactiveTheme: {
      ...DEFAULTS.interactiveTheme,
      ...(next?.interactiveTheme || {}),
    },
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

export function mergeMenuUiSettings(base, patch) {
  return {
    ...DEFAULTS,
    ...(base || {}),
    ...(patch || {}),
    interactiveTheme: {
      ...DEFAULTS.interactiveTheme,
      ...(base?.interactiveTheme || {}),
      ...(patch?.interactiveTheme || {}),
    },
  };
}

export function getProfileAvatar() {
  return localStorage.getItem(AVATAR_KEY) || "";
}

export function saveProfileAvatar(dataUrl) {
  if (!dataUrl) {
    localStorage.removeItem(AVATAR_KEY);
    return;
  }
  localStorage.setItem(AVATAR_KEY, String(dataUrl));
}
