import "server-only";

import {
  isPathKey,
  type AttributeKey,
  type PathConfiguration,
  type PathPriority,
  type PathSelection,
} from "@ascend/shared";
import { suggestPaths } from "@/features/engine/runner";
import type { PathSuggestion, PathSuggestionOutput } from "@/features/engine/types";
import type { AthleteStats } from "@/features/stats/data";
import { createClient } from "@/lib/supabase/server";

/** Current Paths and history, read with the athlete's session (RLS: own rows only). */

export interface CurrentPaths extends PathSelection {
  activeSince: string | null;
}

export async function getCurrentPaths(userId: string): Promise<CurrentPaths> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("current_athlete_paths")
    .select("path_key, priority, active_since")
    .eq("athlete_id", userId);
  if (error) throw new Error(`Loading Paths: ${error.message}`);
  const rows = (data ?? []).filter((row) => isPathKey(row.path_key));
  return {
    primary: (rows.find((row) => row.priority === "primary")?.path_key as AttributeKey | undefined) ?? null,
    secondary: rows
      .filter((row) => row.priority === "secondary")
      .map((row) => row.path_key as AttributeKey)
      .sort(),
    activeSince: rows[0]?.active_since ?? null,
  };
}

export async function getPathHistory(userId: string): Promise<PathConfiguration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athlete_path_history")
    .select("revision, valid_from, valid_until, paths")
    .eq("athlete_id", userId)
    .order("revision");
  if (error) throw new Error(`Loading Path history: ${error.message}`);
  return (data ?? []).map((row) => ({
    revision: row.revision ?? 0,
    validFrom: row.valid_from ?? "",
    validUntil: row.valid_until,
    paths: (Array.isArray(row.paths) ? row.paths : [])
      .filter((p): p is { path: string; priority: string } => typeof p === "object" && p !== null && "path" in p)
      .filter((p) => isPathKey(p.path))
      .map((p) => ({ path: p.path as AttributeKey, priority: (p.priority === "primary" ? "primary" : "secondary") as PathPriority })),
  }));
}

/**
 * Advisory suggestions from the engine (ADR-041), computed from the latest
 * Stats on demand. Nothing is stored. `null` when the engine cannot be
 * reached: the athlete can still choose freely.
 */
export async function getPathSuggestions(stats: AthleteStats): Promise<PathSuggestionOutput | null> {
  try {
    return await suggestPaths({
      stats: Object.fromEntries(
        Object.entries(stats.stats).map(([key, stat]) => [key, { current: stat.current, confidence: stat.confidence, status: stat.status }]),
      ),
    });
  } catch {
    return null;
  }
}

export type { PathSuggestion };
