/**
 * Server-side tenant access: resolve business/location scope for authenticated users.
 * Uses memberships (V2.3), business ownership, and profiles.role (master_admin).
 */

function isMissingRelationError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('schema cache');
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {string} userId
 * @returns {Promise<{ role: string | null }>}
 */
export async function getProfileRole(fastify, userId) {
  const { data, error } = await fastify.supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error && !isMissingRelationError(error)) throw error;
  return { role: data?.role ?? null };
}

/**
 * @returns {Promise<boolean>}
 */
export async function isPlatformAdmin(fastify, userId) {
  const { role } = await getProfileRole(fastify, userId);
  const r = String(role || '').toLowerCase();
  return r === 'master_admin' || r === 'super_admin';
}

/**
 * Load location row with business_id.
 * @returns {Promise<{ id: string, business_id: string } | null>}
 */
export async function getLocationById(fastify, locationId) {
  const { data, error } = await fastify.supabaseAdmin
    .from('locations')
    .select('id, business_id')
    .eq('id', locationId)
    .maybeSingle();
  if (error && !isMissingRelationError(error)) throw error;
  return data || null;
}

/**
 * @returns {Promise<boolean>}
 */
export async function isBusinessOwner(fastify, userId, businessId) {
  const { data, error } = await fastify.supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (error && !isMissingRelationError(error)) throw error;
  return Boolean(data);
}

/**
 * Membership grants access to all locations when location_id is null.
 * @returns {Promise<boolean>}
 */
export async function hasMembershipForLocation(fastify, userId, businessId, locationId) {
  const { data, error } = await fastify.supabaseAdmin
    .from('memberships')
    .select('id, location_id, status')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .eq('status', 'active');

  if (error) {
    if (isMissingRelationError(error)) return false;
    throw error;
  }
  const rows = data || [];
  return rows.some((m) => !m.location_id || m.location_id === locationId);
}

/**
 * Throws if user cannot manage resources for this location (403/404).
 */
export async function assertCanAccessLocation(fastify, userId, locationId) {
  const loc = await getLocationById(fastify, locationId);
  if (!loc) {
    const err = new Error('Location not found');
    err.statusCode = 404;
    throw err;
  }

  if (await isPlatformAdmin(fastify, userId)) return;

  if (await isBusinessOwner(fastify, userId, loc.business_id)) return;

  const ok = await hasMembershipForLocation(fastify, userId, loc.business_id, locationId);
  if (!ok) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
}

/**
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function listMembershipsForUser(fastify, userId) {
  const { data, error } = await fastify.supabaseAdmin
    .from('memberships')
    .select('id, business_id, location_id, role_key, status')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
  const rows = data || [];
  const bizIds = [...new Set(rows.map((r) => r.business_id).filter(Boolean))];
  const locIds = [...new Set(rows.map((r) => r.location_id).filter(Boolean))];

  const { data: businesses } =
    bizIds.length > 0
      ? await fastify.supabaseAdmin.from('businesses').select('id, name, slug').in('id', bizIds)
      : { data: [] };
  const { data: locations } =
    locIds.length > 0
      ? await fastify.supabaseAdmin.from('locations').select('id, name, slug, business_id').in('id', locIds)
      : { data: [] };

  const bizMap = Object.fromEntries((businesses || []).map((b) => [b.id, b]));
  const locMap = Object.fromEntries((locations || []).map((l) => [l.id, l]));

  return rows.map((r) => ({
    ...r,
    business: bizMap[r.business_id] || null,
    location: r.location_id ? locMap[r.location_id] || null : null,
  }));
}
