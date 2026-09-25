import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { SIGN_IN_PATH } from "./routes";
import { createClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * Verified current user for this request, or null. Deduplicated per request.
 * getClaims() validates the JWT signature, so this is safe to use as the
 * authorization check close to the data (proxy.ts is only optimistic).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const { sub, email } = data.claims;
  if (typeof sub !== "string") return null;
  return { id: sub, email: typeof email === "string" ? email : null };
});

/** Returns the verified user or redirects to sign-in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(SIGN_IN_PATH);
  return user;
}
