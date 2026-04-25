import {
  MAX_DIGITAL_CATEGORIES,
  MAX_DIGITAL_DESCRIPTION_LENGTH,
  MAX_DIGITAL_ITEMS_PER_CATEGORY,
  MAX_DIGITAL_NAME_LENGTH,
  MAX_DIGITAL_PRICE_LENGTH,
} from './menu.constants.js';

function clientError(message, status = 400) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

/**
 * Enforce shape, unknown-key rejection, and size limits for stored JSON (defense in depth with Zod on HTTP).
 */
export function validateDigitalMenuPayload(dm) {
  if (dm === undefined || dm === null) return;
  if (typeof dm !== 'object' || Array.isArray(dm)) {
    throw clientError('digital_menu must be an object');
  }
  const allowedTop = new Set(['categories']);
  for (const k of Object.keys(dm)) {
    if (!allowedTop.has(k)) {
      throw clientError(`digital_menu: unknown field "${k}"`);
    }
  }
  if (!('categories' in dm)) return;
  const cats = dm.categories;
  if (!Array.isArray(cats)) {
    throw clientError('digital_menu.categories must be an array');
  }
  if (cats.length > MAX_DIGITAL_CATEGORIES) {
    throw clientError(`At most ${MAX_DIGITAL_CATEGORIES} categories`);
  }
  const catKeys = new Set(['name', 'items']);
  const itemKeys = new Set(['name', 'description', 'price']);
  for (let ci = 0; ci < cats.length; ci += 1) {
    const c = cats[ci];
    if (c == null || typeof c !== 'object' || Array.isArray(c)) {
      throw clientError(`digital_menu.categories[${ci}] must be an object`);
    }
    for (const ck of Object.keys(c)) {
      if (!catKeys.has(ck)) {
        throw clientError(`digital_menu.categories[${ci}]: unknown field "${ck}"`);
      }
    }
    if (c.name != null && String(c.name).length > MAX_DIGITAL_NAME_LENGTH) {
      throw clientError(`Category name too long (max ${MAX_DIGITAL_NAME_LENGTH} characters)`);
    }
    if (!('items' in c)) continue;
    if (!Array.isArray(c.items)) {
      throw clientError(`digital_menu.categories[${ci}].items must be an array`);
    }
    if (c.items.length > MAX_DIGITAL_ITEMS_PER_CATEGORY) {
      throw clientError(`At most ${MAX_DIGITAL_ITEMS_PER_CATEGORY} items per category`);
    }
    for (let ii = 0; ii < c.items.length; ii += 1) {
      const it = c.items[ii];
      if (it == null || typeof it !== 'object' || Array.isArray(it)) {
        throw clientError(`digital_menu.categories[${ci}].items[${ii}] must be an object`);
      }
      for (const ik of Object.keys(it)) {
        if (!itemKeys.has(ik)) {
          throw clientError(`digital_menu.categories[${ci}].items[${ii}]: unknown field "${ik}"`);
        }
      }
      if (it.name != null && String(it.name).length > MAX_DIGITAL_NAME_LENGTH) {
        throw clientError(`Item name too long (max ${MAX_DIGITAL_NAME_LENGTH} characters)`);
      }
      if (it.description != null && String(it.description).length > MAX_DIGITAL_DESCRIPTION_LENGTH) {
        throw clientError(`Item description too long (max ${MAX_DIGITAL_DESCRIPTION_LENGTH} characters)`);
      }
      if (it.price != null && String(it.price).length > MAX_DIGITAL_PRICE_LENGTH) {
        throw clientError(`Item price too long (max ${MAX_DIGITAL_PRICE_LENGTH} characters)`);
      }
    }
  }
}
