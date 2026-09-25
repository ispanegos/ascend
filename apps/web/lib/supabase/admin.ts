import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Service-role client. Server-only, and used for exactly one thing: calling
 * public.engine_record_calculation, the only write path for derived Stats
 * (spec §48 "privileged engine writes happen server-side", ADR-024).
 * Never import this from a Client Component; `server-only` enforces it.
 */
export function createEngineWriter() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (server-only).");
  const { url } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
