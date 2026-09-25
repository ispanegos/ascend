import "server-only";

import { eventRule, hasReached, isSpawnState, transition, type SpawnEvent } from "@ascend/shared";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";

/** Result of a Spawn server action. `redirectTo` is where the client goes next. */
export type ActionResult =
  | { ok: true; redirectTo?: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; redirectTo?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface AdvanceOptions {
  /** Treat "already at or beyond the target state" as success (double taps, stale tabs). */
  allowAlreadyPast?: boolean;
  /** Extra settings columns written in the same update. */
  patch?: Omit<TablesUpdate<"athlete_settings">, "spawn_state" | "athlete_id">;
}

/**
 * Applies one Spawn event (spec §11, ADR-012). The update is conditional on
 * the state it was computed from, so concurrent requests cannot both apply.
 * Postgres independently rejects anything but a single step forward.
 */
export async function advanceSpawn(
  supabase: Supabase,
  userId: string,
  event: SpawnEvent,
  options: AdvanceOptions = {},
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("athlete_settings")
    .select("spawn_state")
    .eq("athlete_id", userId)
    .single();
  if (error || !isSpawnState(data.spawn_state)) {
    return { ok: false, error: "Your Spawn progress didn't load. Try again." };
  }

  const current = data.spawn_state;
  const next = transition(current, event);
  if (!next) {
    if (options.allowAlreadyPast && hasReached(current, eventRule(event).to)) return { ok: true };
    return { ok: false, error: "This step isn't available yet.", redirectTo: "/" };
  }

  const { data: updated, error: updateError } = await supabase
    .from("athlete_settings")
    .update({ ...options.patch, spawn_state: next })
    .eq("athlete_id", userId)
    .eq("spawn_state", current)
    .select("spawn_state");
  if (updateError) return { ok: false, error: "That didn't save. Check your connection and try again." };
  if (updated.length === 0) {
    // Someone else moved the state first; fine if it moved where we wanted.
    return options.allowAlreadyPast ? { ok: true } : { ok: false, error: "Spawn moved on. Reload.", redirectTo: "/" };
  }
  return { ok: true };
}
