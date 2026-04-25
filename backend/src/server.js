import Fastify from 'fastify';
import { supabase, supabaseAdmin } from './config/supabase.js';

import { securityPlugin } from './plugins/security.js';
import authPlugin from './plugins/auth.js';
import { v1Routes } from './routes/v1.js';
import multipart from '@fastify/multipart';
import { isOriginAllowed } from './config/corsAllowlist.js';

const app = Fastify({
  trustProxy: true
});

// Register first so this `onSend` runs *last* (Fastify invokes onSend in reverse registration order).
app.addHook('onSend', (request, reply, payload, done) => {
  const raw =
    request.headers.origin ?? request.raw?.headers?.origin ?? request.raw?.headers?.Origin;
  const allowed = isOriginAllowed(raw);
  if (allowed && !reply.getHeader('access-control-allow-origin')) {
    reply.header('Access-Control-Allow-Origin', allowed);
    const vary = reply.getHeader('vary');
    if (!vary) reply.header('Vary', 'Origin');
    else if (typeof vary === 'string' && !vary.toLowerCase().includes('origin')) {
      reply.header('Vary', `${vary}, Origin`);
    }
  }
  done(null, payload);
});

// decorators
app.decorate('supabase', supabase);
app.decorate('supabaseAdmin', supabaseAdmin);

const missingRuntimeEnv = [
  !process.env.SUPABASE_URL ? 'SUPABASE_URL' : null,
  !process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : null,
  !process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
].filter(Boolean);

// root route
app.get('/', async () => {
  return { message: 'API is working 🚀' };
});

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('🔴 Missing Supabase environment vars. Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

// In production serverless, do not hard-crash imports when env vars are missing.
// Return a clear 500 payload so deployment issues are diagnosable from API response.
app.addHook('onRequest', async (request, reply) => {
  if (missingRuntimeEnv.length === 0) return;
  if (request.url === '/') return;
  reply.code(500).send({
    message: 'Backend environment is not configured',
    missing: missingRuntimeEnv,
  });
});

app.setErrorHandler((error, request, reply) => {
  console.error('🚨 [ERROR]', request.method, request.url, error);
  const status = error.statusCode || error.status || 500;
  const body = {
    statusCode: status,
    error: error.name || 'InternalServerError',
    message: error.message || 'Internal server error',
  };
  reply.status(status).send(body);
});

// register plugins
let startupError = null;
try {
  await app.register(securityPlugin);
  await app.register(authPlugin);
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }
  });
  await app.register(v1Routes, { prefix: '/api/v1' });

  // prepare app (IMPORTANT)
  await app.ready();
} catch (err) {
  startupError = err;
  console.error('🔴 Backend startup failed:', err);
}

const VERCEl_ENV = !!process.env.VERCEL;

if (!VERCEl_ENV) {
  if (startupError) process.exit(1);
  const port = Number(process.env.PORT || 5000);
  const host = process.env.HOST || '0.0.0.0';
  app.listen({ port, host })
    .then(() => {
      console.log(`🚀 Backend running locally at http://${host}:${port}/`);
    })
    .catch((err) => {
      console.error('Backend listen failed', err);
      process.exit(1);
    });
}

// ✅ EXPORT handler (this is what Vercel needs)
// Wait until Node finishes the response — otherwise the serverless invocation can end before CORS
// (and other) headers are flushed, which browsers report as a CORS failure even when the API returned 200.
export default async function handler(req, res) {
  if (startupError) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        message: 'Backend startup failed',
        error: startupError?.message || 'Unknown startup error',
      })
    );
    return;
  }
  await new Promise((resolve, reject) => {
    const done = () => resolve();
    res.once('finish', done);
    res.once('close', done);
    res.once('error', reject);
    try {
      app.server.emit('request', req, res);
    } catch (err) {
      res.off('finish', done);
      res.off('close', done);
      reject(err);
    }
  });
}