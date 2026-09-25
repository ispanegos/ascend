import type { SessionKind, SpawnState } from "@ascend/shared";
import { TODAY_PATH } from "@/lib/routes";
import { isOnboardingStep } from "./onboarding/steps";

/**
 * Where an athlete resumes Spawn (spec §11 "allow the user to leave and
 * resume", §49). Pure so it can be unit tested; app/page.tsx supplies the data.
 */

export interface SessionPointer {
  kind: SessionKind;
  status: "in_progress" | "completed";
  current_test_key: string | null;
}

export const SPAWN_PATH = "/spawn";
export const SPAWN_COMPLETE_PATH = "/spawn/complete";

export function onboardingPath(step: string): string {
  return `/spawn/body/${step}`;
}

export function sessionPath(kind: SessionKind): string {
  return `/spawn/${kind}`;
}

export function testPath(kind: SessionKind, testKey: string): string {
  return `/spawn/${kind}/${testKey.toLowerCase()}`;
}

function resumeSession(kind: SessionKind, sessions: readonly SessionPointer[]): string {
  const session = sessions.find((s) => s.kind === kind && s.status === "in_progress");
  if (!session) return kind === "movement" ? SPAWN_PATH : sessionPath(kind);
  return session.current_test_key ? testPath(kind, session.current_test_key) : sessionPath(kind);
}

export function resolveSpawnPath(
  state: SpawnState,
  onboardingStep: string | null,
  sessions: readonly SessionPointer[],
): string {
  switch (state) {
    case "NOT_STARTED":
      return onboardingPath("welcome");
    case "BODY_PROFILE":
      return onboardingPath(isOnboardingStep(onboardingStep) ? onboardingStep : "name");
    case "MOVEMENT_PENDING":
      return resumeSession("movement", sessions);
    case "FRAME_PENDING":
      return resumeSession("frame", sessions);
    case "ENGINE_PENDING":
      return resumeSession("engine", sessions);
    case "MOVEMENT_COMPLETE":
    case "FRAME_COMPLETE":
      return SPAWN_PATH;
    case "ENGINE_COMPLETE":
    case "CALIBRATING":
      return SPAWN_COMPLETE_PATH;
    case "COMPLETE":
      return TODAY_PATH;
  }
}
