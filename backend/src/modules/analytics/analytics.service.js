import { parseDateRangeToUtcBounds } from '../../utils/dateRange.js';

export class AnalyticsService {
  constructor(supabaseAdmin) {
    this.supabaseAdmin = supabaseAdmin;
  }

  async trackMenuView(analyticsData) {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('menu_analytics')
        .insert([{
          shop_id: analyticsData.shop_id,
          shop_username: analyticsData.shop_username,
          device_type: analyticsData.device_type,
          browser: analyticsData.browser || null,
          os: analyticsData.os || null,
          os_version: analyticsData.os_version || null,
          device_brand: analyticsData.device_brand || null,
          user_agent: analyticsData.user_agent,
          ip_address: analyticsData.ip_address || null,
          country: analyticsData.country || null,
          region: analyticsData.region || null,
          latitude: analyticsData.latitude || null,
          longitude: analyticsData.longitude || null,
          referrer: analyticsData.referrer || null,
          session_id: analyticsData.session_id || null,
          tracked_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('Error tracking analytics:', error);
        throw error;
      }

      return { success: true, data };
    } catch (err) {
      console.error('Analytics tracking error:', err);
      throw err;
    }
  }

  async getAnalyticsSummary(shopId, startDate, endDate) {
    try {
      let query = this.supabaseAdmin
        .from('menu_analytics')
        .select('*');

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      const { startIso, endExclusiveIso } = parseDateRangeToUtcBounds(startDate, endDate);
      if (startIso) {
        query = query.gte('tracked_at', startIso);
      }
      if (endExclusiveIso) {
        query = query.lt('tracked_at', endExclusiveIso);
      }

      const { data, error } = await query.order('tracked_at', { ascending: false });

      if (error) {
        throw error;
      }

      const summary = {
        total_views: data.length,
        device_breakdown: this._getDeviceBreakdown(data),
        /** Phones & tablets only — use for “which brands” (Link-in-bio traffic is mostly here). */
        mobile_brand_breakdown: this._getMobileBrandBreakdown(data),
        /** Desktop / laptop only — meaningful OS split (Windows vs macOS vs Linux). */
        desktop_os_breakdown: this._getDesktopOsBreakdown(data),
        browser_breakdown: this._getBrowserBreakdown(data),
        os_breakdown: this._getOSBreakdown(data),
        country_breakdown: this._getCountryBreakdown(data),
        daily_views: this._getDailyViews(data),
        top_referrers: this._getTopReferrers(data),
      };

      return { success: true, data: summary };
    } catch (err) {
      console.error('Error fetching analytics summary:', err);
      throw err;
    }
  }

  async getAnalyticsDetail(shopId, limit = 100, offset = 0) {
    try {
      let query = this.supabaseAdmin
        .from('menu_analytics')
        .select('*');

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      const { data, error, count } = await query
        .order('tracked_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data,
        pagination: {
          limit,
          offset,
          total: count,
        },
      };
    } catch (err) {
      console.error('Error fetching analytics details:', err);
      throw err;
    }
  }

  _getDeviceBreakdown(data) {
    const breakdown = {};
    data.forEach((item) => {
      const device = item.device_type || 'unknown';
      breakdown[device] = (breakdown[device] || 0) + 1;
    });
    return breakdown;
  }

  _getMobileBrandBreakdown(data) {
    const breakdown = {};
    data.forEach((item) => {
      const dt = item.device_type || '';
      if (dt !== 'mobile' && dt !== 'tablet') return;
      const brand = item.device_brand || 'unknown';
      breakdown[brand] = (breakdown[brand] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  }

  _getDesktopOsBreakdown(data) {
    const breakdown = {};
    data.forEach((item) => {
      if ((item.device_type || '') !== 'desktop') return;
      const os = item.os || 'unknown';
      breakdown[os] = (breakdown[os] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  }

  _getBrowserBreakdown(data) {
    const breakdown = {};
    data.forEach((item) => {
      const browser = item.browser || 'unknown';
      breakdown[browser] = (breakdown[browser] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  }

  _getOSBreakdown(data) {
    const breakdown = {};
    data.forEach((item) => {
      const os = item.os || 'unknown';
      breakdown[os] = (breakdown[os] || 0) + 1;
    });
    return breakdown;
  }

  _getCountryBreakdown(data) {
    const breakdown = {};
    data.forEach((item) => {
      const country = item.country || 'unknown';
      breakdown[country] = (breakdown[country] || 0) + 1;
    });
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  }

  _getDailyViews(data) {
    const daily = {};
    data.forEach((item) => {
      const date = new Date(item.tracked_at).toISOString().split('T')[0];
      daily[date] = (daily[date] || 0) + 1;
    });
    return daily;
  }

  _getTopReferrers(data) {
    const referrers = {};
    data.forEach((item) => {
      if (item.referrer) {
        referrers[item.referrer] = (referrers[item.referrer] || 0) + 1;
      }
    });
    return Object.entries(referrers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  }
}
