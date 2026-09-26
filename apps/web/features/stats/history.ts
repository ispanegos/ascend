import "server-only";

import { HISTORY_WINDOWS, type AttributeKey, type HistoryPoint } from "@ascend/shared";
import { createClient } from "@/lib/supabase/server";

/**
 * Stat and Overall history (ADR-042): the stored snapshots, nothing else.
 * Reads a year — the longest window — with the athlete's session (RLS).
 */

const DAY_MS = 86_400_000;

function since(now: Date): string {
  return new Date(now.getTime() - HISTORY_WINDOWS["1y"] * DAY_MS).toISOString();
}

const num = (value: number | string | null) => (value === null ? null : Number(value));

export async function getStatHistories(userId: string, now = new Date()): Promise<Record<AttributeKey, HistoryPoint[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stat_snapshots")
    .select("attribute, calculated_at, current, verified_peak, confidence, engine_version")
    .eq("athlete_id", userId)
    .gte("calculated_at", since(now))
    .order("calculated_at");
  if (error) throw new Error(`Loading Stat history: ${error.message}`);
  const out: Record<string, HistoryPoint[]> = {};
  for (const row of data ?? []) {
    (out[row.attribute] ??= []).push({
      at: row.calculated_at,
      current: num(row.current),
      peak: num(row.verified_peak),
      confidence: Number(row.confidence),
      engineVersion: row.engine_version,
    });
  }
  return out as Record<AttributeKey, HistoryPoint[]>;
}

export async function getOverallHistory(userId: string, now = new Date()): Promise<HistoryPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("overall_snapshots")
    .select("calculated_at, current, confidence, engine_version")
    .eq("athlete_id", userId)
    .gte("calculated_at", since(now))
    .order("calculated_at");
  if (error) throw new Error(`Loading Overall history: ${error.message}`);
  return (data ?? []).map((row) => ({
    at: row.calculated_at,
    current: num(row.current),
    peak: null,
    confidence: Number(row.confidence),
    engineVersion: row.engine_version,
  }));
}
