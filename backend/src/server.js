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

// register plugins
await app.register(securityPlugin);
await app.register(authPlugin);
await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 }
});
await app.register(v1Routes, { prefix: '/api/v1' });

// prepare app (IMPORTANT)
await app.ready();

// ✅ EXPORT handler (THIS is what Vercel needs)
export default async function handler(req, res) {
  app.server.emit('request', req, res);
}