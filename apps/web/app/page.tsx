import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { HOME_PATH, SIGN_IN_PATH } from "@/lib/routes";

/**
 * Root. Redirects by session (proxy.ts normally handles this first).
 * Milestone 2 replaces the signed-in target with the Spawn-state redirect
 * (spec §49, ADR-005).
 */
export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? HOME_PATH : SIGN_IN_PATH);
}
