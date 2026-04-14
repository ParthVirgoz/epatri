const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4321',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:3000',
  'https://epatri-admin.vercel.app',
  'https://www.epatri-admin.vercel.app',
  'https://epatri.vercel.app',
  'https://www.epatri.vercel.app',
  'https://epatri-be.vercel.app',
];

function parseExtraOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/[,\n;]+/)
    .map((o) => o.trim())
    .filter(Boolean);
}

export const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9][a-z0-9-._]*\.vercel\.app$/i;

export function getAllowedOrigins() {
  const extra = parseExtraOrigins();
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

export function previewsEnabled() {
  return String(process.env.CORS_ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';
}

export function normalizeOriginHeader(value) {
  if (value == null || typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, '');
}

export function isOriginAllowed(originHeader) {
  const o = normalizeOriginHeader(Array.isArray(originHeader) ? originHeader[0] : originHeader);
  if (!o) return '';
  const list = getAllowedOrigins();
  if (list.includes(o)) return o;
  if (previewsEnabled() && VERCEL_PREVIEW_ORIGIN.test(o)) return o;
  return '';
}
