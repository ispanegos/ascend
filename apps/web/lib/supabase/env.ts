/**
 * Public Supabase configuration. The anon key is safe in the browser: all
 * access is governed by RLS (spec §48). The service role key is read only by
 * lib/supabase/admin.ts, on the server, to persist engine results (ADR-024).
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy apps/web/.env.example to apps/web/.env.local.",
    );
  }
  return { url, anonKey };
}
