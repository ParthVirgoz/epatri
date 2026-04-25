import { createClient } from "@supabase/supabase-js";

let cachedClient = null;

export function getSupabaseRealtimeClient() {
  if (cachedClient) return cachedClient;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  cachedClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
