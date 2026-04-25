import {
  MAX_DIGITAL_CATEGORIES,
  MAX_DIGITAL_DESCRIPTION_LENGTH,
  MAX_DIGITAL_ITEMS_PER_CATEGORY,
  MAX_DIGITAL_NAME_LENGTH,
  MAX_DIGITAL_PRICE_LENGTH,
} from "./menuConstants.js";

/**
 * @returns {string|null} Error message, or null if OK.
 */
export function validateDigitalMenuClient(dm) {
  if (dm == null || typeof dm !== "object" || Array.isArray(dm)) {
    return "Interactive menu data is invalid.";
  }
  const allowedTop = new Set(["categories"]);
  for (const k of Object.keys(dm)) {
    if (!allowedTop.has(k)) {
      return `Unknown field on menu: ${k}`;
    }
  }
  if (!("categories" in dm)) return null;
  const cats = dm.categories;
  if (!Array.isArray(cats)) {
    return "Categories must be a list.";
  }
  if (cats.length > MAX_DIGITAL_CATEGORIES) {
    return `At most ${MAX_DIGITAL_CATEGORIES} categories.`;
  }
  const catKeys = new Set(["name", "items"]);
  const itemKeys = new Set(["name", "description", "price"]);
  for (let ci = 0; ci < cats.length; ci += 1) {
    const c = cats[ci];
    if (c == null || typeof c !== "object" || Array.isArray(c)) {
      return `Invalid category ${ci + 1}.`;
    }
    for (const ck of Object.keys(c)) {
      if (!catKeys.has(ck)) {
        return `Unknown field on category ${ci + 1}.`;
      }
    }
    if (c.name != null && String(c.name).length > MAX_DIGITAL_NAME_LENGTH) {
      return `Category name is too long (max ${MAX_DIGITAL_NAME_LENGTH} characters).`;
    }
    if (!("items" in c)) continue;
    if (!Array.isArray(c.items)) {
      return `Items in category ${ci + 1} must be a list.`;
    }
    if (c.items.length > MAX_DIGITAL_ITEMS_PER_CATEGORY) {
      return `At most ${MAX_DIGITAL_ITEMS_PER_CATEGORY} items per category.`;
    }
    for (let ii = 0; ii < c.items.length; ii += 1) {
      const it = c.items[ii];
      if (it == null || typeof it !== "object" || Array.isArray(it)) {
        return `Invalid item in category ${ci + 1}.`;
      }
      for (const ik of Object.keys(it)) {
        if (!itemKeys.has(ik)) {
          return `Unknown field on an item in category ${ci + 1}.`;
        }
      }
      if (it.name != null && String(it.name).length > MAX_DIGITAL_NAME_LENGTH) {
        return `Item name is too long (max ${MAX_DIGITAL_NAME_LENGTH} characters).`;
      }
      if (it.description != null && String(it.description).length > MAX_DIGITAL_DESCRIPTION_LENGTH) {
        return `Description is too long (max ${MAX_DIGITAL_DESCRIPTION_LENGTH} characters).`;
      }
      if (it.price != null && String(it.price).length > MAX_DIGITAL_PRICE_LENGTH) {
        return `Price is too long (max ${MAX_DIGITAL_PRICE_LENGTH} characters).`;
      }
    }
  }
  return null;
}
