import "server-only";

import { redirect } from "next/navigation";
import { requireUser, type SessionUser } from "@/lib/auth";
import { getSpawnSnapshot } from "./data";

/**
 * The main ASCEND shell stays locked until Spawn and calibration are
 * complete (ADR-023 §9). Profile and sign-out are not guarded.
 */
export async function requireInitializedAthlete(): Promise<SessionUser> {
  const user = await requireUser();
  const { state } = await getSpawnSnapshot(user.id);
  if (state !== "COMPLETE") redirect("/");
  return user;
}

export async function isAthleteInitialized(userId: string): Promise<boolean> {
  return (await getSpawnSnapshot(userId)).state === "COMPLETE";
}
