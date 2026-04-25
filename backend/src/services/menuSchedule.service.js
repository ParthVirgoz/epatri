/**
 * Resolve which menu PDF/digital payload is active for a location at time `at`.
 * Calendar dates and weekdays use MENU_SCHEDULE_TZ (default UTC). Set MENU_SCHEDULE_TZ=Region/City
 * so weekly/day rules match the business (e.g. Asia/Kolkata).
 */

const MENU_SCHEDULE_TZ = process.env.MENU_SCHEDULE_TZ || 'UTC';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function calendarYmdAndDowInTz(at) {
  const d = at instanceof Date ? at : new Date(at);
  if (MENU_SCHEDULE_TZ === 'UTC') {
    return { ymd: d.toISOString().slice(0, 10), dow: d.getUTCDay() };
  }
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: MENU_SCHEDULE_TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const ws = get('weekday');
  const dow = WEEKDAY_SHORT.indexOf(ws);
  const y = get('year');
  const mo = get('month');
  const day = get('day');
  return { ymd: `${y}-${mo}-${day}`, dow: dow >= 0 ? dow : d.getUTCDay() };
}

function isMissingRelationError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('schema cache');
}

/** Pick which version in a group guests see — published only (drafts never go live until publish). */
export function pickBestMenuVersionInGroup(versions) {
  const list = Array.isArray(versions) ? versions : [];
  const eligible = list.filter((m) => m && m.status === 'published' && menuHasGuestVisibleContent(m));
  if (!eligible.length) return null;
  eligible.sort((a, b) => {
    const def = (x) => (x.is_default ? 1 : 0);
    if (def(b) !== def(a)) return def(b) - def(a);
    const so = Number(a.sort_order) - Number(b.sort_order);
    if (so !== 0) return so;
    return String(a.id).localeCompare(String(b.id));
  });
  return eligible[0];
}

/** True if guests should treat this menu row as having something to show (non-empty PDF URL or real digital items). */
export function menuHasGuestVisibleContent(menu) {
  if (!menu) return false;
  const pdf = menu.pdf_url != null && String(menu.pdf_url).trim() !== '';
  if (pdf) return true;
  const dm = menu.digital_menu;
  if (!dm || typeof dm !== 'object') return false;
  const cats = dm.categories;
  if (Array.isArray(cats) && cats.length > 0) return true;
  const keys = Object.keys(dm).filter((k) => k !== 'categories');
  return keys.length > 0;
}

/**
 * @param {Date} at
 * @param {object} row
 * @returns {boolean}
 */
export function scheduleMatchesAt(at, row) {
  const { ymd, dow } = calendarYmdAndDowInTz(at);

  switch (row.schedule_type) {
    case 'always':
      return true;
    case 'weekly': {
      const days = row.days_of_week;
      if (!Array.isArray(days) || days.length === 0) return false;
      return days.map(Number).includes(dow);
    }
    case 'date_range': {
      if (!row.valid_from || !row.valid_to) return false;
      return ymd >= row.valid_from && ymd <= row.valid_to;
    }
    case 'single_date':
      return Boolean(row.single_date && ymd === row.single_date);
    default:
      return false;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} locationId
 * @param {Date} [at]
 * @returns {Promise<{ menu: object | null, schedule_id: string | null, resolution: string }>}
 */
async function fetchCompanyMasterRows(db, businessId) {
  let { data: rows, error: mErr } = await db
    .from('menus')
    .select('id, pdf_url, digital_menu, status, location_id, business_id, title')
    .eq('business_id', businessId)
    .eq('is_business_master', true)
    .eq('status', 'published');

  if (mErr && String(mErr.message || '').toLowerCase().includes('is_business_master')) {
    ({ data: rows, error: mErr } = await db
      .from('menus')
      .select('id, pdf_url, digital_menu, status, location_id, business_id, title')
      .eq('business_id', businessId)
      .is('location_id', null)
      .eq('title', 'Company menu')
      .eq('status', 'published'));
  }

  if (mErr && !isMissingRelationError(mErr)) throw mErr;
  const list = rows || [];
  const withContent = list.filter((m) => menuHasGuestVisibleContent(m));
  return withContent[0] || null;
}

export async function resolveActiveMenuForLocation(db, locationId, at = new Date()) {
  let locRow = null;
  let locErr = null;
  ({ data: locRow, error: locErr } = await db
    .from('locations')
    .select('id, business_id, follows_business_master_menu')
    .eq('id', locationId)
    .maybeSingle());

  if (
    locErr &&
    String(locErr.message || '')
      .toLowerCase()
      .includes('follows_business_master_menu')
  ) {
    ({ data: locRow, error: locErr } = await db
      .from('locations')
      .select('id, business_id')
      .eq('id', locationId)
      .maybeSingle());
    if (locRow) locRow = { ...locRow, follows_business_master_menu: false };
  } else if (locErr && !isMissingRelationError(locErr)) {
    throw locErr;
  }

  if (locRow?.business_id && locRow.follows_business_master_menu === true) {
    const master = await fetchCompanyMasterRows(db, locRow.business_id);
    if (master) {
      return {
        menu: master,
        schedule_id: null,
        resolution: 'business_master',
      };
    }
  }

  let allMenus = [];
  let menuByGroup = new Map();
  const selMenus =
    'id, pdf_url, digital_menu, status, location_id, business_id, title, is_default, sort_order, menu_group_id';
  let { data: locMenus, error: lmErr } = await db
    .from('menus')
    .select(selMenus)
    .eq('location_id', locationId)
    .eq('status', 'published');

  if (lmErr && String(lmErr.message || '').toLowerCase().includes('menu_group_id')) {
    ({ data: locMenus, error: lmErr } = await db
      .from('menus')
      .select('id, pdf_url, digital_menu, status, location_id, business_id, title, is_default, sort_order')
      .eq('location_id', locationId)
      .eq('status', 'published'));
  }
  if (lmErr && !isMissingRelationError(lmErr)) throw lmErr;
  allMenus = locMenus || [];
  for (const m of allMenus) {
    if (!m.menu_group_id) continue;
    if (!menuByGroup.has(m.menu_group_id)) menuByGroup.set(m.menu_group_id, []);
    menuByGroup.get(m.menu_group_id).push(m);
  }

  let schedRows = [];
  let { data: fetchedSched, error: sErr } = await db
    .from('menu_schedules')
    .select(
      'id, menu_id, menu_group_id, location_id, schedule_type, days_of_week, valid_from, valid_to, single_date, priority, is_active, menus ( id, pdf_url, digital_menu, status, location_id, business_id, title, menu_group_id )'
    )
    .eq('location_id', locationId)
    .eq('is_active', true);

  if (sErr && String(sErr.message || '').toLowerCase().includes('menu_group_id')) {
    ({ data: fetchedSched, error: sErr } = await db
      .from('menu_schedules')
      .select(
        'id, menu_id, location_id, schedule_type, days_of_week, valid_from, valid_to, single_date, priority, is_active, menus ( id, pdf_url, digital_menu, status, location_id, business_id, title )'
      )
      .eq('location_id', locationId)
      .eq('is_active', true));
  }
  if (sErr) {
    if (!isMissingRelationError(sErr)) throw sErr;
    schedRows = [];
  } else {
    schedRows = fetchedSched || [];
  }

  const rows = schedRows;
  const candidates = [];

  for (const row of rows) {
    let menu = null;
    if (row.menu_group_id) {
      menu = pickBestMenuVersionInGroup(menuByGroup.get(row.menu_group_id) || []);
    } else {
      const m = Array.isArray(row.menus) ? row.menus[0] : row.menus;
      if (!m || m.location_id !== locationId) continue;
      if (m.status === 'archived') continue;
      if (!menuHasGuestVisibleContent(m)) continue;
      if (m.status !== 'published') continue;
      menu = m;
    }
    if (!menu) continue;
    if (scheduleMatchesAt(at, row)) {
      candidates.push({
        schedule_id: row.id,
        priority: Number(row.priority) || 0,
        menu_id: menu.id,
        menu,
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return String(a.menu_id).localeCompare(String(b.menu_id));
  });

  if (candidates.length > 0) {
    const first = candidates[0];
    return {
      menu: first.menu,
      schedule_id: first.schedule_id,
      resolution: 'schedule',
    };
  }

  if (menuByGroup.size > 0) {
    let groupOrder = [];
    const { data: groupRows, error: gErr } = await db
      .from('menu_groups')
      .select('id, sort_order')
      .eq('location_id', locationId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (!gErr && groupRows?.length) {
      groupOrder = groupRows.map((g) => g.id);
    } else {
      groupOrder = [...menuByGroup.keys()];
    }
    for (const gid of groupOrder) {
      const best = pickBestMenuVersionInGroup(menuByGroup.get(gid) || []);
      if (best) {
        return { menu: best, schedule_id: null, resolution: 'fallback_menu' };
      }
    }
    return { menu: null, schedule_id: null, resolution: 'none' };
  }

  const { data: fallback } = await db
    .from('menus')
    .select('id, pdf_url, digital_menu, status, location_id, is_default, sort_order, business_id')
    .eq('location_id', locationId)
    .eq('status', 'published')
    .order('is_default', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(25);

  const list = fallback || [];
  const withContent = list.filter((m) => menuHasGuestVisibleContent(m));
  const def = withContent[0] || null;
  if (def) {
    return { menu: def, schedule_id: null, resolution: 'fallback_menu' };
  }

  return { menu: null, schedule_id: null, resolution: 'none' };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {string} locationId
 */
export async function loadMenusForLocation(db, locationId) {
  let sel =
    'id, title, status, is_default, sort_order, pdf_url, digital_menu, location_id, business_id, user_id, menu_group_id, display_as, updated_at';
  let { data, error } = await db
    .from('menus')
    .select(sel)
    .eq('location_id', locationId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error && String(error.message || '').toLowerCase().includes('menu_group_id')) {
    sel = 'id, title, status, is_default, sort_order, pdf_url, digital_menu, location_id, business_id, user_id, updated_at';
    ({ data, error } = await db
      .from('menus')
      .select(sel)
      .eq('location_id', locationId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }));
  }
  if (error) throw error;
  return data || [];
}

/**
 * Menu groups with nested versions for admin UI.
 * @returns {{ groups: Array<{ id, title, sort_order, menus: object[] }>, menus: object[] }}
 */
export async function loadMenuGroupsStructure(db, locationId) {
  const flat = await loadMenusForLocation(db, locationId);
  const { data: groups, error: gErr } = await db
    .from('menu_groups')
    .select('id, title, sort_order, location_id')
    .eq('location_id', locationId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (gErr) {
    if (isMissingRelationError(gErr)) {
      return { groups: [], menus: flat };
    }
    throw gErr;
  }
  const gList = groups || [];
  if (gList.length === 0) {
    return { groups: [], menus: flat };
  }
  const map = new Map(gList.map((g) => [g.id, { ...g, menus: [] }]));
  const orphans = [];
  for (const m of flat) {
    if (m.menu_group_id && map.has(m.menu_group_id)) {
      map.get(m.menu_group_id).menus.push(m);
    } else {
      orphans.push(m);
    }
  }
  if (orphans.length && map.size > 0) {
    const first = [...map.values()][0];
    first.menus.push(...orphans);
  }
  return { groups: [...map.values()], menus: flat };
}
