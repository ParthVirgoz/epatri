import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

/** Baseline origins — always merged with `ALLOWED_ORIGINS` so a bad env value cannot wipe the list. */
const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4321',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:3000',
  'https://epatri-be.vercel.app',
  'https://epatri-admin.vercel.app',
  'https://epatri.vercel.app',
];

function parseExtraOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/[,\n;]+/)
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Production Vercel preview URLs (e.g. `*-git-*-team.vercel.app`). Opt-in — set `CORS_ALLOW_VERCEL_PREVIEWS=true`. */
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9][a-z0-9-._]*\.vercel\.app$/i;

export async function securityPlugin(fastify) {
  const extra = parseExtraOrigins();
  const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...extra])];

  fastify.log.info(
    {
      ALLOWED_ORIGINS_env: process.env.ALLOWED_ORIGINS ?? null,
      extraCount: extra.length,
      effectiveCount: allowedOrigins.length,
    },
    '[Security] CORS allowlist built'
  );

  const previewsEnabled = String(process.env.CORS_ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

  const corsOptions = {
    origin(origin, cb) {
      if (!origin) {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      if (previewsEnabled && VERCEL_PREVIEW_ORIGIN.test(origin)) {
        fastify.log.debug({ origin }, '[Security] CORS allowed (Vercel preview)');
        return cb(null, true);
      }
      fastify.log.warn({ origin, allowedOrigins }, '[Security] CORS blocked origin');
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
    /** JWT is sent in `Authorization`; cookies are not required for this API — `false` avoids extra browser CORS edge cases. */
    credentials: false,
    maxAge: 86400,
  };

  // CORS before Helmet so security headers never run ahead of allowlist logic; Helmet still applies after.
  await fastify.register(cors, corsOptions);

  await fastify.register(helmet, {
    crossOriginResourcePolicy: false,
  });
}
