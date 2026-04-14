/**
 * Parse User-Agent for analytics. Order matters: Android UAs contain "Linux; Android …"
 * so Android/iOS must be detected before generic Linux.
 */

function detectAndroidBrand(ua) {
  if (/Samsung|SM-[A-Z0-9]|SCH-|SGH-|Galaxy/i.test(ua)) return 'Samsung';
  if (/Pixel|Google/i.test(ua)) return 'Google';
  if (/OnePlus/i.test(ua)) return 'OnePlus';
  if (/Xiaomi|Redmi|POCO|\bMi\s/i.test(ua)) return 'Xiaomi';
  if (/Huawei|Honor/i.test(ua)) return 'Huawei';
  if (/OPPO|CPH-|Reno/i.test(ua)) return 'OPPO';
  if (/\bvivo\b|V\d{4}[A-Z]{0,2}/i.test(ua)) return 'vivo';
  if (/realme/i.test(ua)) return 'realme';
  if (/Moto|Motorola/i.test(ua)) return 'Motorola';
  if (/\bLG[-_\s]|LG\)/i.test(ua)) return 'LG';
  if (/Sony/i.test(ua)) return 'Sony';
  if (/Nothing/i.test(ua)) return 'Nothing';
  if (/Nokia/i.test(ua)) return 'Nokia';
  return 'Android';
}

export function parseUserAgent(userAgent) {
  const ua = userAgent || '';
  const result = {
    device_type: 'desktop',
    browser: 'unknown',
    os: 'unknown',
    os_version: 'unknown',
    device_brand: 'unknown',
  };

  if (!ua) return result;

  // iPadOS 13+ often reports as Macintosh + Mobile (no "iPad" in UA)
  const isIPadSafari =
    /\biPad\b/i.test(ua) ||
    (/\bMacintosh\b/i.test(ua) && /\bMobile\b/i.test(ua) && /Safari/i.test(ua) && !/Android/i.test(ua));

  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  const isTablet =
    isIPadSafari ||
    isAndroidTablet ||
    /\btablet\b|PlayBook|Silk(?!.*Mobile)/i.test(ua);

  const isMobile =
    !isTablet &&
    /Android.*Mobile|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile\/|CriOS|FxiOS/i.test(ua);

  if (isTablet) result.device_type = 'tablet';
  else if (isMobile) result.device_type = 'mobile';

  // OS (Android before Linux!)
  if (/Windows NT/i.test(ua)) {
    result.os = 'Windows';
    const m = ua.match(/Windows NT ([\d.]+)/);
    if (m) result.os_version = m[1];
  } else if (/Android/i.test(ua)) {
    result.os = 'Android';
    const m = ua.match(/Android ([\d._]+)/);
    if (m) result.os_version = m[1].replace(/_/g, '.');
  } else if (/iPhone|iPod/i.test(ua)) {
    result.os = 'iOS';
    const m = ua.match(/OS ([\d_]+)/i);
    if (m) result.os_version = m[1].replace(/_/g, '.');
  } else if (isIPadSafari || /\biPad\b/i.test(ua)) {
    result.os = 'iPadOS';
    const m = ua.match(/OS ([\d_]+)/i) || ua.match(/Version\/([\d.]+)/i);
    if (m) result.os_version = m[1].replace(/_/g, '.');
  } else if (/\bMac OS X\b/i.test(ua) || /\bMacintosh\b/i.test(ua)) {
    result.os = 'macOS';
    const m = ua.match(/Mac OS X ([\d_]+)/i);
    if (m) result.os_version = m[1].replace(/_/g, '.');
  } else if (/CrOS/i.test(ua)) {
    result.os = 'Chrome OS';
  } else if (/Linux/i.test(ua)) {
    result.os = 'Linux';
  }

  // Browser (order matters on iOS / Chromium forks)
  if (/Edg\//i.test(ua)) result.browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) result.browser = 'Opera';
  else if (/CriOS/i.test(ua)) result.browser = 'Chrome';
  else if (/FxiOS/i.test(ua)) result.browser = 'Firefox';
  else if (/SamsungBrowser/i.test(ua)) result.browser = 'Samsung Internet';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) result.browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua)) result.browser = 'Safari';
  else if (/Firefox/i.test(ua)) result.browser = 'Firefox';

  // Brand: meaningful on phones/tablets; desktop stays generic unless Apple
  if (/iPhone|iPod/i.test(ua)) result.device_brand = 'Apple';
  else if (isIPadSafari || /\biPad\b/i.test(ua)) result.device_brand = 'Apple';
  else if (/Android/i.test(ua)) result.device_brand = detectAndroidBrand(ua);
  else if (result.os === 'macOS') result.device_brand = 'Apple';
  else if (result.device_type === 'desktop') result.device_brand = 'PC';

  return result;
}
