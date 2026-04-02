import { AnalyticsService } from './analytics.service.js';
import { trackAnalyticsSchema, analyticsQuerySchema } from './analytics.schema.js';

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

    const analyticsService = new AnalyticsService(req.server.supabaseAdmin);
    const result = await analyticsService.getAnalyticsSummary(
      shopData.id,
      start_date,
      end_date
    );

    return reply.send(result);
  } catch (err) {
    console.error('Fetch analytics summary error:', err);
    return reply.code(500).send({ message: err.message });
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
    return reply.code(500).send({ message: err.message });
  }
}

// Helper function to parse user agent
function parseUserAgent(userAgent) {
  const result = {
    device_type: 'desktop',
    browser: 'unknown',
    os: 'unknown',
    os_version: 'unknown',
    device_brand: 'unknown',
  };

  if (!userAgent) return result;

  // Detect device type
  if (/mobile|android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile/i.test(userAgent)) {
    result.device_type = /iPad|Android.*?tablet/i.test(userAgent) ? 'tablet' : 'mobile';
  }

  // Detect OS
  if (/Windows/i.test(userAgent)) {
    result.os = 'Windows';
    const match = userAgent.match(/Windows NT ([\d.]+)/);
    if (match) result.os_version = match[1];
  } else if (/Mac/i.test(userAgent)) {
    result.os = 'macOS';
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    if (match) result.os_version = match[1].replace(/_/g, '.');
  } else if (/Linux/i.test(userAgent)) {
    result.os = 'Linux';
  } else if (/Android/i.test(userAgent)) {
    result.os = 'Android';
    const match = userAgent.match(/Android ([\d.]+)/);
    if (match) result.os_version = match[1];
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    result.os = 'iOS';
    const match = userAgent.match(/OS ([\d_]+)/);
    if (match) result.os_version = match[1].replace(/_/g, '.');
  }

  // Detect browser
  if (/Edge/i.test(userAgent)) {
    result.browser = 'Edge';
  } else if (/Chrome/i.test(userAgent)) {
    result.browser = 'Chrome';
  } else if (/Safari/i.test(userAgent)) {
    result.browser = 'Safari';
  } else if (/Firefox/i.test(userAgent)) {
    result.browser = 'Firefox';
  }

  // Detect device brand
  if (/iPhone/i.test(userAgent)) {
    result.device_brand = 'Apple';
  } else if (/iPad/i.test(userAgent)) {
    result.device_brand = 'Apple';
  } else if (/Android/i.test(userAgent)) {
    if (/Samsung/i.test(userAgent)) result.device_brand = 'Samsung';
    else if (/Xiaomi/i.test(userAgent)) result.device_brand = 'Xiaomi';
    else if (/Huawei/i.test(userAgent)) result.device_brand = 'Huawei';
    else result.device_brand = 'Android';
  }

  return result;
}
