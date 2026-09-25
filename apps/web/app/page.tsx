import { redirect } from "next/navigation";
import { getSpawnSnapshot, sessionPointers } from "@/features/spawn/data";
import { resolveSpawnPath } from "@/features/spawn/routing";
import { getSessionUser } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/routes";

/**
 * Authenticated root: sends the athlete to exactly where they left Spawn, or
 * to Today once Spawn is complete (spec §11, §49, ADR-010).
 */
export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) redirect(SIGN_IN_PATH);

  const { state, settings, sessions } = await getSpawnSnapshot(user.id);
  redirect(resolveSpawnPath(state, settings.onboarding_step, sessionPointers(sessions)));
}
