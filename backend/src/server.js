import Fastify from 'fastify';
import { supabase, supabaseAdmin } from './config/supabase.js';

import { securityPlugin } from './plugins/security.js';
import authPlugin from './plugins/auth.js';
import { v1Routes } from './routes/v1.js';
import multipart from '@fastify/multipart';

const app = Fastify({
  trustProxy: true
});

// decorators
app.decorate('supabase', supabase);
app.decorate('supabaseAdmin', supabaseAdmin);

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
await app.register(securityPlugin);
await app.register(authPlugin);
await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 }
});
await app.register(v1Routes, { prefix: '/api/v1' });

// Add CORS headers to all responses (serverless fix)
app.addHook('preHandler', (request, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  reply.header('Access-Control-Allow-Credentials', 'true');
  done();
});

// prepare app (IMPORTANT)
await app.ready();

const VERCEl_ENV = !!process.env.VERCEL;

if (!VERCEl_ENV) {
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
export default async function handler(req, res) {
  app.server.emit('request', req, res);
}