import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import {
  getAllowedOrigins,
  isOriginAllowed,
  normalizeOriginHeader,
  previewsEnabled,
  VERCEL_PREVIEW_ORIGIN,
} from '../config/corsAllowlist.js';

export async function securityPlugin(fastify) {
  const allowedOrigins = getAllowedOrigins();

  fastify.log.info(
    {
      ALLOWED_ORIGINS_env: process.env.ALLOWED_ORIGINS ?? null,
      effectiveCount: allowedOrigins.length,
    },
    '[Security] CORS allowlist built'
  );

  const previews = previewsEnabled();

  function resolveCorsOriginValue(requestOrigin) {
    const o = normalizeOriginHeader(requestOrigin);
    if (!o) return true;
    if (allowedOrigins.includes(o)) return allowedOrigins;
    if (previews && VERCEL_PREVIEW_ORIGIN.test(o)) return allowedOrigins;
    return false;
  }

  const corsOptions = {
    origin(originHeader, cb) {
      const resolved = resolveCorsOriginValue(originHeader);
      if (resolved === false) {
        fastify.log.warn(
          { origin: originHeader, normalized: normalizeOriginHeader(originHeader), allowedOrigins },
          '[Security] CORS blocked origin'
        );
      }
      cb(null, resolved);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: null,
    exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
    credentials: false,
    maxAge: 86400,
    strictPreflight: false,
  };

  await fastify.register(cors, corsOptions);

  await fastify.register(helmet, {
    crossOriginResourcePolicy: false,
  });
}
