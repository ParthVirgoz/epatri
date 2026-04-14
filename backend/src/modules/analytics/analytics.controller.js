import { AnalyticsService } from './analytics.service.js';
import { trackAnalyticsSchema, analyticsQuerySchema } from './analytics.schema.js';
import { parseUserAgent } from '../../utils/parseUserAgent.js';

/** Only the profile owner for this `shop_username` may read analytics. */
async function assertShopOwner(req, shopUsername) {
  const { data: profile, error } = await req.server.supabaseAdmin
    .from('profiles')
    .select('shop_username')
    .eq('id', req.user.id)
    .single();

  if (error || !profile || profile.shop_username !== shopUsername) {
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

    // Get shop info
    const { data: shopData, error: shopError } = await req.server.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('shop_username', shop_username)
      .single();

    if (shopError || !shopData) {
      console.error('❌ [Analytics] Shop not found:', shop_username, shopError);
      return reply.code(404).send({ message: 'Shop not found', username: shop_username });
    }

    console.log('✅ [Analytics] Shop found:', shopData.id);

    // Prepare analytics data
    const analyticsData = {
      shop_id: shopData.id,
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
    };

    console.log('📊 [Analytics] Data to validate:', analyticsData);

    // Validate data
    const validatedData = trackAnalyticsSchema.parse(analyticsData);
    console.log('✅ [Analytics] Validation passed:', validatedData);

    // Create analytics service and track
    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.trackMenuView(validatedData);

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

export async function getAnalyticsSummaryController(req, reply) {
  try {
    const { shop_username } = req.params;
    const { start_date, end_date } = req.query;

    // Get shop info
    const { data: shopData, error: shopError } = await req.server.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('shop_username', shop_username)
      .single();

    if (shopError || !shopData) {
      return reply.code(404).send({ message: 'Shop not found' });
    }

    await assertShopOwner(req, shop_username);

    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.getAnalyticsSummary(
      shopData.id,
      start_date,
      end_date
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
    const { limit = 100, offset = 0 } = req.query;

    // Validate query
    const validatedQuery = analyticsQuerySchema.parse({ limit, offset });

    // Get shop info
    const { data: shopData, error: shopError } = await req.server.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('shop_username', shop_username)
      .single();

    if (shopError || !shopData) {
      return reply.code(404).send({ message: 'Shop not found' });
    }

    await assertShopOwner(req, shop_username);

    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.getAnalyticsDetail(
      shopData.id,
      validatedQuery.limit,
      validatedQuery.offset
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
