/**
 * Analytics Tracker Utility
 * Tracks user interactions with the shop menu and sends data to backend
 */

class AnalyticsTracker {
  constructor(apiBaseUrl = null) {
    // Get API URL from window or use auto-detected URL
    this.apiBaseUrl = apiBaseUrl || this.getApiBaseUrl();
    this.sessionId = this.generateSessionId();
  }

  getApiBaseUrl() {
    const envUrl = typeof import.meta !== 'undefined' ? import.meta.env.PUBLIC_API_URL : undefined;

    // Prefer explicit public env var set for both desktop and mobile
    if (envUrl) {
      console.log('🌐 [Tracker] Using PUBLIC_API_URL from env:', envUrl);
      return envUrl;
    }

    // Preserve old global override path if set
    if (typeof window !== 'undefined' && window.PUBLIC_API_URL) {
      console.log('🌐 [Tracker] Using PUBLIC_API_URL from window:', window.PUBLIC_API_URL);
      return window.PUBLIC_API_URL;
    }

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;

      console.log('🌐 [Tracker] Current location:', { protocol, hostname, port });

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const url = `${protocol}//localhost:5000/api/v1`;
        console.log('🌐 [Tracker] Using localhost URL:', url);
        return url;
      }

      // Production fallback for deployed frontend host
      if (hostname.includes('epatri.vercel.app')) {
        const url = 'https://epatri-be.vercel.app/api/v1';
        console.log('🌐 [Tracker] Using prod backend URL:', url);
        return url;
      }

      // If explicit API URL is not configured, try same host path as last resort
      const url = `${protocol}//${hostname}/api/v1`;
      console.log('🌐 [Tracker] Using inferred host URL:', url);
      return url;
    }

    console.log('🌐 [Tracker] Using fallback URL: http://localhost:5000/api/v1');
    return 'http://localhost:5000/api/v1';
  }

  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect device type from user agent
   */
  detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|android(?!.*mobile)/.test(ua)) {
      return 'tablet';
    } else if (/mobile|android|iphone|ipod|webos|blackberry|iemobile/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get user's device information from user agent
   */
  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    
    return {
      user_agent: userAgent,
      device_type: this.detectDeviceType(),
      referrer: document.referrer || null,
      session_id: this.sessionId,
    };
  }

  /**
   * Attempt to get geolocation data
   */
  async getGeolocationData() {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => {
            resolve({
              latitude: null,
              longitude: null,
            });
          }
        );
      } else {
        resolve({
          latitude: null,
          longitude: null,
        });
      }
    });
  }

  /**
   * Get IP and location info from IP Geolocation API (optional)
   */
  async getIpLocationData() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name,
          region: data.region,
          ip_address: data.ip,
        };
      }
    } catch (err) {
      console.warn('Could not fetch IP location:', err);
    }
    return {
      country: null,
      region: null,
      ip_address: null,
    };
  }

  /**
   * Track menu view for a specific shop
   */
  async trackMenuView(shopUsername) {
    try {
      console.log('📡 [Tracker.trackMenuView] Starting for shop:', shopUsername);
      
      const deviceInfo = this.getDeviceInfo();
      console.log('📱 [Tracker] Device info collected:', deviceInfo);
      
      const locData = await this.getIpLocationData();
      console.log('🌍 [Tracker] Location data collected:', locData);
      
      const geoData = await this.getGeolocationData();
      console.log('📍 [Tracker] Geolocation data collected:', geoData);

      const payload = {
        ...deviceInfo,
        ...locData,
        ...geoData,
      };

      console.log('📊 [Tracker] Full payload before sending:', payload);
      console.log('🌐 [Tracker] API URL:', this.apiBaseUrl);
      console.log('📡 [Tracker] Endpoint:', `${this.apiBaseUrl}/analytics/shop/${shopUsername}/track`);

      const response = await fetch(
        `${this.apiBaseUrl}/analytics/shop/${shopUsername}/track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          mode: 'cors',
        }
      );

      console.log('📊 [Tracker] Response received, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Tracker] HTTP Error:', response.status, errorText);
        return { success: false, error: errorText, status: response.status };
      }

      const result = await response.json();
      console.log('✅ [Tracker] Analytics tracked successfully!');
      console.log('✅ [Tracker] Response:', result);
      return result;
    } catch (err) {
      console.error('❌ [Tracker] Error tracking menu view:');
      console.error('❌ [Tracker] Error message:', err.message);
      console.error('❌ [Tracker] Error stack:', err.stack);
      return null;
    }
  }

  /**
   * Track specific user interactions
   */
  async trackEvent(shopUsername, eventType, eventData = {}) {
    try {
      const payload = {
        ...this.getDeviceInfo(),
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(
        `${this.apiBaseUrl}/analytics/shop/${shopUsername}/track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        console.warn('Event tracking response:', response.status);
      }

      return await response.json();
    } catch (err) {
      console.error('Error tracking event:', err);
      return null;
    }
  }

  /**
   * Save session data to localStorage
   */
  saveSessionData(shopUsername, data) {
    const sessionData = {
      shop: shopUsername,
      sessionId: this.sessionId,
      startTime: Date.now(),
      ...data,
    };

    try {
      sessionStorage.setItem('analyticsSession', JSON.stringify(sessionData));
    } catch (err) {
      console.warn('Could not save session data:', err);
    }
  }

  getSessionData() {
    try {
      const data = sessionStorage.getItem('analyticsSession');
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn('Could not retrieve session data:', err);
      return null;
    }
  }
}

// Export singleton instance
export const analyticsTracker = new AnalyticsTracker(
  typeof window !== 'undefined' ? 
    (window.PUBLIC_API_URL || 'http://localhost:5000/api/v1') : 
    'http://localhost:5000/api/v1'
);

export default AnalyticsTracker;