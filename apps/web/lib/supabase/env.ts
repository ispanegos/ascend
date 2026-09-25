/**
 * Public Supabase configuration. The anon key is safe in the browser: all
 * access is governed by RLS (spec §48). The service role key is never read by
 * the web app.
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
