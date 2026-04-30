import { AnalyticsService } from './analytics.service.js';
import { trackAnalyticsSchema, analyticsQuerySchema } from './analytics.schema.js';
import { parseUserAgent } from '../../utils/parseUserAgent.js';
import { publishAnalyticsEvent, subscribeAnalyticsShop } from './analytics.realtime.js';
import { isOriginAllowed } from '../../config/corsAllowlist.js';
import { bumpTreeImpactCounters } from '../public/public.service.js';

async function getBusinessBySlug(req, shopUsername) {
  const { data: business, error } = await req.server.supabaseAdmin
    .from('businesses')
    .select('id, owner_user_id, slug')
    .eq('slug', shopUsername)
    .maybeSingle();
  if (error || !business) {
    const err = new Error('Shop not found');
    err.statusCode = 404;
    throw err;
  }
  return business;
}

/** Only business owner for this slug may read analytics. */
async function assertShopOwner(req, shopUsername) {
  const business = await getBusinessBySlug(req, shopUsername);
  if (business.owner_user_id !== req.user.id) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
  return business;
}

/** When filtering by `location_id`, ensure it belongs to the user's business (post–V2 migration). */
async function assertCanReadAnalyticsForLocation(req, shopUsername, locationId) {
  const business = await assertShopOwner(req, shopUsername);
  if (!locationId) return;

  const { data: loc } = await req.server.supabaseAdmin
    .from('locations')
    .select('business_id')
    .eq('id', locationId)
    .maybeSingle();

  if (!loc) {
    const err = new Error('Location not found');
    err.statusCode = 404;
    throw err;
  }
  if (loc.business_id !== business.id) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }
}

export async function trackMenuViewController(req, reply) {
  try {
    const { shop_username } = req.params;
    console.log('📊 [Analytics] Tracking request for shop:', shop_username);

    // Get IP and detect location if available
    const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    console.log('📊 [Analytics] Client IP:', ip);
    
    // Parse user agent for device info
    const userAgent = req.headers['user-agent'] || '';
    console.log('📊 [Analytics] User Agent:', userAgent);
    const deviceInfo = parseUserAgent(userAgent);
    console.log('📊 [Analytics] Device Info:', deviceInfo);

    const business = await getBusinessBySlug(req, shop_username);

    console.log('✅ [Analytics] Shop found:', business.id);

    // Prepare analytics data
    const analyticsData = {
      shop_id: business.owner_user_id,
      shop_username,
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      os_version: deviceInfo.os_version,
      device_brand: deviceInfo.device_brand,
      user_agent: userAgent,
      ip_address: ip,
      referrer: req.headers.referer || null,
      session_id: req.body?.session_id || null,
      country: req.body?.country || null,
      region: req.body?.region || null,
      latitude: req.body?.latitude || null,
      longitude: req.body?.longitude || null,
      business_id: req.body?.business_id || business.id,
      location_id: req.body?.location_id || null,
      menu_id: req.body?.menu_id || null,
      event_type: req.body?.event_type || 'view',
    };

    console.log('📊 [Analytics] Data to validate:', analyticsData);

    // Validate data
    const validatedData = trackAnalyticsSchema.parse(analyticsData);
    console.log('✅ [Analytics] Validation passed:', validatedData);

    // Create analytics service and track
    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.trackMenuView(validatedData);
    // Keep impact increments inside the existing menu tracking API flow.
    await bumpTreeImpactCounters(req.server, { source: 'menu' }).catch(() => null);
    publishAnalyticsEvent(shop_username, {
      type: 'menu_open',
      tracked_at: new Date().toISOString(),
      event_type: validatedData.event_type || 'view',
      location_id: validatedData.location_id || null,
      device_type: validatedData.device_type || 'unknown',
    });

    console.log('✅ [Analytics] Tracked successfully');
    return reply.code(201).send({
      message: 'Analytics tracked successfully',
      data: result.data,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      console.error('❌ [Analytics] Validation error:', err.errors);
      return reply.code(400).send({ message: 'Validation error', errors: err.errors });
    }
    console.error('❌ [Analytics] Error:', err.message, err);
    return reply.code(500).send({ message: err.message });
  }
}

export async function streamAnalyticsEventsController(req, reply) {
  const { shop_username } = req.params;
  try {
    await assertShopOwner(req, shop_username);
  } catch (err) {
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || 'Server error' });
  }

  const allowedOrigin = isOriginAllowed(req.headers.origin);
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    Vary: 'Origin',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  reply.raw.writeHead(200, headers);
  reply.raw.write(`event: connected\ndata: {"ok":true}\n\n`);

  const send = (payload) => {
    reply.raw.write(`event: analytics\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  const unsubscribe = subscribeAnalyticsShop(shop_username, send);

  const keepAlive = setInterval(() => {
    reply.raw.write(`: ping ${Date.now()}\n\n`);
  }, 25000);

  req.raw.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
    try {
      reply.raw.end();
    } catch {
      // noop
    }
  });
}

export async function getAnalyticsSummaryController(req, reply) {
  try {
    const { shop_username } = req.params;
    const { start_date, end_date, location_id, tz_offset_min } = req.query;
    const tzOffsetMin = Number.isFinite(Number(tz_offset_min)) ? Number(tz_offset_min) : 0;

    const business = await getBusinessBySlug(req, shop_username);

    await assertCanReadAnalyticsForLocation(req, shop_username, location_id);

    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.getAnalyticsSummary(
      business.owner_user_id,
      start_date,
      end_date,
      location_id,
      tzOffsetMin
    );

    return reply.send(result);
  } catch (err) {
    console.error('Fetch analytics summary error:', err);
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || 'Server error' });
  }
}

export async function getAnalyticsDetailController(req, reply) {
  try {
    const { shop_username } = req.params;
    const { limit = 100, offset = 0, location_id } = req.query;

    // Validate query
    const validatedQuery = analyticsQuerySchema.parse({ limit, offset, location_id });

    const business = await getBusinessBySlug(req, shop_username);

    await assertCanReadAnalyticsForLocation(req, shop_username, validatedQuery.location_id);

    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.getAnalyticsDetail(
      business.owner_user_id,
      validatedQuery.limit,
      validatedQuery.offset,
      validatedQuery.location_id
    );

    return reply.send(result);
  } catch (err) {
    if (err.name === 'ZodError') {
      return reply.code(400).send({ message: 'Validation error', errors: err.errors });
    }
    console.error('Fetch analytics detail error:', err);
    const status = err.statusCode || 500;
    return reply.code(status).send({ message: err.message || 'Server error' });
  }
}
