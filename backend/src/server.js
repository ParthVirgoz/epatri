import Fastify from 'fastify';
import { env } from './config/env.js';
import { supabase, supabaseAdmin } from './config/supabase.js';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION', reason);
  process.exit(1);
});

import { securityPlugin } from './plugins/security.js';
import authPlugin from './plugins/auth.js';
import { v1Routes } from './routes/v1.js';

import multipart from "@fastify/multipart";

const app = Fastify({
  //   logger: true,
  trustProxy: true
});

app.decorate("supabase", supabase);
app.decorate("supabaseAdmin", supabaseAdmin);

await app.register(securityPlugin);
await app.register(authPlugin);
await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
await app.register(v1Routes, { prefix: '/api/v1' });

app.listen({ host: '0.0.0.0', port: env.PORT }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});