import {
  assertCanAccessLocation,
  getLocationById,
  isBusinessOwner,
} from '../../services/tenantScope.service.js';
import { loadMenuGroupsStructure } from '../../services/menuSchedule.service.js';
import {
  MAX_LEGACY_MENUS_PER_LOCATION,
  MAX_MENU_GROUPS_PER_LOCATION,
  MAX_MENU_TITLE_LENGTH,
  MAX_DRAFT_VERSIONS_PER_MENU,
  MAX_SCHEDULE_RULES_PER_MENU_GROUP,
  MAX_VERSIONS_PER_MENU,
} from './menu.constants.js';
import { validateDigitalMenuPayload } from './digitalMenu.validation.js';

function clampMenuTitle(raw, fallback) {
  const s = String(raw ?? '').trim().slice(0, MAX_MENU_TITLE_LENGTH);
  return s || fallback;
}

export async function canManageBusinessWideMenus(fastify, userId, businessId) {
  if (!businessId) return false;
  if (await isBusinessOwner(fastify, userId, businessId)) return true;
  const { data, error } = await fastify.supabaseAdmin
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .is('location_id', null)
    .limit(1);
  if (error) return false;
  return Boolean(data?.length);
}

function clientError(message, status = 400) {
  const e = new Error(message);
  e.statusCode = status;
  return e;
}

function menuVersionScopeFromMenu(menu) {
  if (menu?.menu_group_id) return { column: 'menu_group_id', value: menu.menu_group_id };
  return { column: 'location_id', value: menu?.location_id };
}

async function countMenuVersionsByStatus(fastify, scope, status) {
  if (!scope?.value) return 0;
  const { count, error } = await fastify.supabaseAdmin
    .from('menus')
    .select('id', { count: 'exact', head: true })
    .eq(scope.column, scope.value)
    .eq('status', status);
  if (error) throw new Error(error.message);
  return Number(count) || 0;
}

async function countTotalVersionsInScope(fastify, scope) {
  if (!scope?.value) return 0;
  const { count, error } = await fastify.supabaseAdmin
    .from('menus')
    .select('id', { count: 'exact', head: true })
    .eq(scope.column, scope.value);
  if (error) throw new Error(error.message);
  return Number(count) || 0;
}

/**
 * When a new draft would exceed per-group draft or total-version caps, remove the oldest
 * draft (by updated_at, then id) so the newest work is always kept — matches product rule:
 * adding a new draft drops the stale draft, not the published row.
 */
async function deleteOldestDraftInScope(fastify, scope) {
  if (!scope?.value) return false;
  const { data, error } = await fastify.supabaseAdmin
    .from('menus')
    .select('id')
    .eq(scope.column, scope.value)
    .eq('status', 'draft')
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) return false;
  const { error: dErr } = await fastify.supabaseAdmin.from('menus').delete().eq('id', data.id);
  if (dErr) throw new Error(dErr.message);
  return true;
}

async function deleteOldestArchivedInScope(fastify, scope) {
  if (!scope?.value) return false;
  const { data, error } = await fastify.supabaseAdmin
    .from('menus')
    .select('id')
    .eq(scope.column, scope.value)
    .eq('status', 'archived')
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) return false;
  const { error: dErr } = await fastify.supabaseAdmin.from('menus').delete().eq('id', data.id);
  if (dErr) throw new Error(dErr.message);
  return true;
}

async function makeRoomForNewDraftVersion(fastify, scope) {
  if (!scope?.value) return;
  for (let i = 0; i < 8; i += 1) {
    const total = await countTotalVersionsInScope(fastify, scope);
    const drafts = await countMenuVersionsByStatus(fastify, scope, 'draft');
    if (total < MAX_VERSIONS_PER_MENU && drafts < MAX_DRAFT_VERSIONS_PER_MENU) return;
    // Prefer evicting stale draft first, then oldest archived.
    let removed = await deleteOldestDraftInScope(fastify, scope);
    if (!removed) removed = await deleteOldestArchivedInScope(fastify, scope);
    if (!removed) {
      throw clientError('Max 3 versions allowed. Delete a version first.', 400);
    }
  }
  throw clientError('Max 3 versions allowed. Delete a version first.', 400);
}

export async function assertCanAccessMenu(fastify, userId, menu) {
  if (!menu) throw clientError('Menu not found', 404);
  if (menu.location_id) {
    await assertCanAccessLocation(fastify, userId, menu.location_id);
    return;
  }
  if (menu.business_id && (await isBusinessOwner(fastify, userId, menu.business_id))) return;
  if (menu.business_id && (await canManageBusinessWideMenus(fastify, userId, menu.business_id))) return;
  if (menu.user_id === userId) return;
  throw clientError('Forbidden', 403);
}

export async function listMenusForLocationAdmin(fastify, userId, locationId) {
  await assertCanAccessLocation(fastify, userId, locationId);
  return loadMenuGroupsStructure(fastify.supabaseAdmin, locationId);
}

export async function createMenuForLocationAdmin(fastify, userId, locationId, body) {
  await assertCanAccessLocation(fastify, userId, locationId);
  const loc = await getLocationById(fastify, locationId);
  if (!loc) throw clientError('Location not found', 404);

  const probe = await fastify.supabaseAdmin.from('menu_groups').select('id').limit(1);
  let requireGroup = true;
  if (probe.error) {
    const m = String(probe.error.message || '').toLowerCase();
    if (m.includes('menu_groups') && (m.includes('does not exist') || m.includes('schema cache'))) {
      requireGroup = false;
    } else {
      throw new Error(probe.error.message);
    }
  }

  let menuGroupId = body?.menu_group_id != null ? String(body.menu_group_id).trim() : '';
  if (requireGroup) {
    if (!menuGroupId) throw clientError('menu_group_id is required', 400);
    const { data: grp, error: ge } = await fastify.supabaseAdmin
      .from('menu_groups')
      .select('id, location_id')
      .eq('id', menuGroupId)
      .maybeSingle();
    if (ge) throw new Error(ge.message);
    if (!grp || grp.location_id !== locationId) throw clientError('Invalid menu_group_id', 400);
    const { count, error: cErr } = await fastify.supabaseAdmin
      .from('menus')
      .select('id', { count: 'exact', head: true })
      .eq('menu_group_id', menuGroupId);
    if (cErr) throw new Error(cErr.message);
    const requestedStatus = ['draft', 'published', 'archived'].includes(body?.status)
      ? body.status
      : 'draft';
    // For draft creation, we allow FIFO eviction of oldest draft (handled below).
    if (requestedStatus !== 'draft' && Number(count) >= MAX_VERSIONS_PER_MENU) {
      throw clientError('Max 3 versions allowed. Delete a version first.', 400);
    }
  }

  const title = String(body?.title || 'New menu').trim() || 'New menu';
  const status = ['draft', 'published', 'archived'].includes(body?.status)
    ? body.status
    : 'draft';
  const sort_order = Number.isFinite(Number(body?.sort_order))
    ? Number(body.sort_order)
    : 0;

  const isDefault = Boolean(body?.is_default);

  if (isDefault) {
    let q = fastify.supabaseAdmin.from('menus').update({ is_default: false }).eq('location_id', locationId);
    if (requireGroup && menuGroupId) q = q.eq('menu_group_id', menuGroupId);
    await q;
  }

  let digitalPayload = body?.digital_menu && typeof body.digital_menu === 'object' && !Array.isArray(body.digital_menu)
    ? body.digital_menu
    : {};
  validateDigitalMenuPayload(digitalPayload);

  const row = {
    user_id: userId,
    business_id: loc.business_id,
    location_id: locationId,
    title,
    status,
    sort_order,
    pdf_url: body?.pdf_url != null && body.pdf_url !== '' ? String(body.pdf_url).slice(0, 2048) : '',
    digital_menu: digitalPayload,
    is_default: isDefault,
  };
  if (requireGroup && menuGroupId) row.menu_group_id = menuGroupId;

  const versionScope = requireGroup && menuGroupId
    ? { column: 'menu_group_id', value: menuGroupId }
    : { column: 'location_id', value: locationId };
  if (status === 'draft') {
    await makeRoomForNewDraftVersion(fastify, versionScope);
  }
  if (status === 'published') {
    const publishedCount = await countMenuVersionsByStatus(fastify, versionScope, 'published');
    if (publishedCount >= 1) {
      throw clientError('Only one public/live version is allowed. Archive or change the current public version first.', 400);
    }
  }

  let { data, error } = await fastify.supabaseAdmin.from('menus').insert(row).select().maybeSingle();
  if (error && String(error.message || '').toLowerCase().includes('menu_group_id')) {
    delete row.menu_group_id;
    ({ data, error } = await fastify.supabaseAdmin.from('menus').insert(row).select().maybeSingle());
  }
  if (error) throw new Error(error.message);
  return data;
}

export async function getMenuByIdAdmin(fastify, menuId) {
  const base =
    'id, user_id, business_id, location_id, title, status, sort_order, pdf_url, digital_menu, is_default';
  let { data, error } = await fastify.supabaseAdmin
    .from('menus')
    .select(`${base}, is_business_master, display_as, menu_group_id`)
    .eq('id', menuId)
    .maybeSingle();
  if (error && String(error.message || '').toLowerCase().includes('column')) {
    ({ data, error } = await fastify.supabaseAdmin
      .from('menus')
      .select(`${base}, is_business_master, display_as`)
      .eq('id', menuId)
      .maybeSingle());
  }
  if (error) throw new Error(error.message);
  return data;
}

export async function patchMenuAdmin(fastify, userId, menuId, body) {
  const menu = await getMenuByIdAdmin(fastify, menuId);
  await assertCanAccessMenu(fastify, userId, menu);

  const patch = {};
  const scope = menuVersionScopeFromMenu(menu);
  const contentTouched =
    body.title !== undefined ||
    body.sort_order !== undefined ||
    body.pdf_url !== undefined ||
    body.digital_menu !== undefined ||
    body.display_as !== undefined;
  const lockedPayloadTouched =
    body.pdf_url !== undefined ||
    body.digital_menu !== undefined ||
    body.display_as !== undefined ||
    body.title !== undefined ||
    body.sort_order !== undefined;
  if (body.title !== undefined) patch.title = clampMenuTitle(body.title, menu.title);
  if (body.status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(body.status)) {
      throw clientError('Invalid status');
    }
    patch.status = body.status;
  }
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);
  if (body.pdf_url !== undefined) {
    if (body.pdf_url === null || body.pdf_url === '') patch.pdf_url = '';
    else patch.pdf_url = String(body.pdf_url).slice(0, 2048);
  }
  if (body.digital_menu !== undefined) {
    if (typeof body.digital_menu !== 'object' || Array.isArray(body.digital_menu)) {
      throw clientError('digital_menu must be an object');
    }
    validateDigitalMenuPayload(body.digital_menu);
    patch.digital_menu = body.digital_menu;
  }
  if (body.is_default !== undefined) patch.is_default = Boolean(body.is_default);
  if (body.display_as !== undefined) {
    if (body.display_as !== null && !['pdf', 'interactive'].includes(body.display_as)) {
      throw clientError('display_as must be pdf, interactive, or null');
    }
    patch.display_as = body.display_as;
  }

  if (menu.status === 'published' && lockedPayloadTouched && body.status === undefined) {
    throw clientError(
      'Published menus are locked. Create a new version to edit content, name, order, PDF, or interactive data.',
      400,
    );
  }

  if (body.status === 'draft' && menu.status === 'published') {
    throw clientError(
      'Cannot demote a published menu to draft. Publish a different version to replace the live menu.',
      400,
    );
  }

  if (body.status === 'draft' && menu.status !== 'draft' && menu.status !== 'published') {
    await makeRoomForNewDraftVersion(fastify, scope);
  }

  if (body.status === 'published') {
    if (!menu.location_id && !menu.business_id) {
      throw clientError('This menu cannot be published', 400);
    }
    const totalVersions = await countTotalVersionsInScope(fastify, scope);
    if (totalVersions > MAX_VERSIONS_PER_MENU) {
      throw clientError('Max 3 versions allowed. Delete a version first.', 400);
    }
    if (scope?.value) {
      await fastify.supabaseAdmin
        .from('menus')
        .update({ status: 'archived', is_default: false })
        .eq(scope.column, scope.value)
        .neq('id', menuId)
        .eq('status', 'published');
    }
    if (menu.location_id) {
      patch.is_default = true;
    }
  }

  let { data, error } = await fastify.supabaseAdmin.from('menus').update(patch).eq('id', menuId).select().maybeSingle();

  if (error && patch.display_as !== undefined && String(error.message || '').toLowerCase().includes('display_as')) {
    const { display_as: _d, ...rest } = patch;
    ({ data, error } = await fastify.supabaseAdmin.from('menus').update(rest).eq('id', menuId).select().maybeSingle());
  }

  if (error) throw new Error(error.message);

  if (patch.status === 'published' && scope?.value) {
    await fastify.supabaseAdmin.from('menus').update({ status: 'published', is_default: true }).eq('id', menuId);
  }

  if (patch.is_default === true && menu.location_id) {
    let clearQ = fastify.supabaseAdmin
      .from('menus')
      .update({ is_default: false })
      .eq('location_id', menu.location_id)
      .neq('id', menuId);
    if (menu.menu_group_id) {
      clearQ = clearQ.eq('menu_group_id', menu.menu_group_id);
    }
    await clearQ;
    await fastify.supabaseAdmin.from('menus').update({ is_default: true }).eq('id', menuId);
  }

  return data;
}

export async function listSchedulesForMenuAdmin(fastify, userId, menuId) {
  const menu = await getMenuByIdAdmin(fastify, menuId);
  await assertCanAccessMenu(fastify, userId, menu);

  let q = fastify.supabaseAdmin.from('menu_schedules').select('*').order('priority', { ascending: false });
  if (menu.menu_group_id) {
    q = q.eq('menu_group_id', menu.menu_group_id);
  } else {
    q = q.eq('menu_id', menuId);
  }
  const { data, error } = await q;

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('does not exist')) return [];
    if (menu.menu_group_id && msg.includes('menu_group_id')) {
      const { data: d2, error: e2 } = await fastify.supabaseAdmin
        .from('menu_schedules')
        .select('*')
        .eq('menu_id', menuId)
        .order('priority', { ascending: false });
      if (e2) {
        const m2 = String(e2.message || '').toLowerCase();
        if (m2.includes('does not exist')) return [];
        throw new Error(e2.message);
      }
      return d2 || [];
    }
    throw new Error(error.message);
  }
  return data || [];
}

export async function replaceSchedulesForMenuAdmin(fastify, userId, menuId, schedules) {
  const menu = await getMenuByIdAdmin(fastify, menuId);
  await assertCanAccessMenu(fastify, userId, menu);
  if (!menu.location_id) {
    throw clientError('Menu must have a location_id to attach schedules', 400);
  }

  if (!Array.isArray(schedules)) throw clientError('schedules must be an array');
  if (schedules.length > MAX_SCHEDULE_RULES_PER_MENU_GROUP) {
    throw clientError(`At most ${MAX_SCHEDULE_RULES_PER_MENU_GROUP} schedule rules per menu`, 400);
  }

  const groupId = menu.menu_group_id || null;
  let delQ = fastify.supabaseAdmin.from('menu_schedules').delete();
  if (groupId) {
    delQ = delQ.eq('menu_group_id', groupId);
  } else {
    delQ = delQ.eq('menu_id', menuId);
  }
  const { error: delErr } = await delQ;

  if (delErr) {
    const msg = String(delErr.message || '').toLowerCase();
    if (!msg.includes('does not exist')) throw new Error(delErr.message);
    throw clientError('menu_schedules table not migrated', 503);
  }

  const rows = schedules.map((s) => {
    const st = s.schedule_type;
    if (!['always', 'weekly', 'date_range', 'single_date'].includes(st)) {
      throw clientError(`Invalid schedule_type: ${st}`);
    }
    const base = {
      menu_id: menuId,
      location_id: menu.location_id,
      schedule_type: st,
      days_of_week: s.days_of_week ?? null,
      valid_from: s.valid_from ?? null,
      valid_to: s.valid_to ?? null,
      single_date: s.single_date ?? null,
      time_start: s.time_start ?? null,
      time_end: s.time_end ?? null,
      priority: Number(s.priority) || 0,
      is_active: s.is_active !== false,
    };
    if (groupId) base.menu_group_id = groupId;
    return base;
  });

  if (rows.length === 0) {
    return [];
  }

  let { data, error } = await fastify.supabaseAdmin.from('menu_schedules').insert(rows).select();
  if (error && groupId && String(error.message || '').toLowerCase().includes('menu_group_id')) {
    const rowsLegacy = rows.map(({ menu_group_id: _m, ...rest }) => rest);
    ({ data, error } = await fastify.supabaseAdmin.from('menu_schedules').insert(rowsLegacy).select());
  }
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMenuGroupForLocationAdmin(fastify, userId, locationId, body) {
  await assertCanAccessLocation(fastify, userId, locationId);
  const loc = await getLocationById(fastify, locationId);
  if (!loc) throw clientError('Location not found', 404);

  const { count: groupCount, error: cntErr } = await fastify.supabaseAdmin
    .from('menu_groups')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId);
  if (cntErr && !String(cntErr.message || '').toLowerCase().includes('menu_groups')) {
    throw new Error(cntErr.message);
  }
  if (!cntErr && Number(groupCount) >= MAX_MENU_GROUPS_PER_LOCATION) {
    throw clientError(`Each outlet can have at most ${MAX_MENU_GROUPS_PER_LOCATION} menus`, 400);
  }

  const groupTitle = clampMenuTitle(body?.title, 'New menu');
  const sortOrder = Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0;

  const { data: group, error: gErr } = await fastify.supabaseAdmin
    .from('menu_groups')
    .insert({
      location_id: locationId,
      business_id: loc.business_id,
      title: groupTitle,
      sort_order: sortOrder,
    })
    .select()
    .maybeSingle();

  if (gErr) {
    const m = String(gErr.message || '').toLowerCase();
    if (m.includes('menu_groups') && (m.includes('does not exist') || m.includes('schema cache'))) {
      throw clientError('Run database migration v2_6_menu_groups.sql first', 503);
    }
    throw new Error(gErr.message);
  }

  const menu = await createMenuForLocationAdmin(fastify, userId, locationId, {
    menu_group_id: group.id,
    title: clampMenuTitle(body?.first_version_title, 'Version 1'),
    status: 'draft',
    is_default: true,
    digital_menu: { categories: [] },
  });

  return { group, menu };
}

export async function deleteMenuGroupAdmin(fastify, userId, groupId) {
  const { data: group, error } = await fastify.supabaseAdmin
    .from('menu_groups')
    .select('id, location_id')
    .eq('id', groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!group) throw clientError('Menu not found', 404);
  await assertCanAccessLocation(fastify, userId, group.location_id);
  const { error: dErr } = await fastify.supabaseAdmin.from('menu_groups').delete().eq('id', groupId);
  if (dErr) throw new Error(dErr.message);
}

export async function deleteMenuVersionAdmin(fastify, userId, menuId) {
  const menu = await getMenuByIdAdmin(fastify, menuId);
  await assertCanAccessMenu(fastify, userId, menu);
  if (!menu.menu_group_id) {
    throw clientError('This menu has no menu group — run migration v2_6', 400);
  }
  if (menu.status === 'published') {
    throw clientError('Cannot delete a published version. Publish another version first.', 400);
  }
  const { count, error: cErr } = await fastify.supabaseAdmin
    .from('menus')
    .select('id', { count: 'exact', head: true })
    .eq('menu_group_id', menu.menu_group_id);
  if (cErr) throw new Error(cErr.message);
  if (Number(count) <= 1) {
    throw clientError('Delete the whole menu instead of removing the last version', 400);
  }
  const { error: delErr } = await fastify.supabaseAdmin.from('menus').delete().eq('id', menuId);
  if (delErr) throw new Error(delErr.message);
  if (menu.is_default) {
    const { data: next } = await fastify.supabaseAdmin
      .from('menus')
      .select('id')
      .eq('menu_group_id', menu.menu_group_id)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next?.id) {
      await fastify.supabaseAdmin.from('menus').update({ is_default: true }).eq('id', next.id);
    }
  }
}
