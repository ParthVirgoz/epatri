import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const canInitPublicClient = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
const canInitAdminClient = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

export const supabase = canInitPublicClient
  ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  : null;

export const supabaseAdmin = canInitAdminClient
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;