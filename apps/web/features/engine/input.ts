import "server-only";

import { latestResults, toResultSummaries } from "@ascend/shared";
import type { createClient } from "@/lib/supabase/server";
import type { EngineInput } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export class InputError extends Error {}

/**
 * Builds the engine input from the athlete's own immutable raw data, read
 * with their session (RLS).
 *
 * Only body mass is sent: no v0.1 curve uses age, sex or height, and
 * experience/inactivity are context only (ADR-023 §5). Sending less also
 * keeps the input — and so the result — stable over time (age changes on a
 * birthday). Body mass is the weight recorded at or before the evidence.
 */
export async function buildEngineInput(supabase: Supabase, athleteId: string): Promise<EngineInput> {
  const [weights, sessions, evidence, snapshots] = await Promise.all([
    supabase
      .from("body_measurements")
      .select("value, measured_at")
      .eq("athlete_id", athleteId)
      .eq("kind", "weight")
      .order("measured_at", { ascending: false }),
    supabase.from("assessment_sessions").select("id").eq("athlete_id", athleteId).eq("purpose", "spawn"),
    supabase
      .from("performance_evidence")
      .select("id, test_key, source_type, occurred_at, raw_payload")
      .eq("athlete_id", athleteId)
      .eq("source_type", "spawn_test")
      .order("occurred_at"),
    supabase
      .from("stat_snapshots")
      .select("attribute, verified_peak, provisional_peak, calculated_at")
      .eq("athlete_id", athleteId)
      .order("calculated_at", { ascending: false }),
  ]);
  if (weights.error || evidence.error || sessions.error || snapshots.error) {
    throw new InputError("Could not read your Spawn data.");
  }

  const results = sessions.data.length
    ? await supabase
        .from("assessment_results")
        .select("id, test_key, status, reason_code, started_at")
        .in("session_id", sessions.data.map((s) => s.id))
    : { data: [], error: null };
  if (results.error) throw new InputError("Could not read your Spawn results.");

  // A test whose newest result is not completed is a gap: unknown, never zero.
  const summaries = toResultSummaries(results.data);
  const latest = latestResults(summaries);
  const completed = new Set(summaries.filter((r) => r.status === "completed").map((r) => r.test_key));
  const gaps = [...latest.values()]
    .filter((r) => !completed.has(r.test_key) && r.status !== "completed")
    .map((r) => ({
      test_key: r.test_key,
      status: r.status,
      reason_code: results.data.find((row) => row.id === r.id)?.reason_code ?? null,
    }));

  // Previous Peaks never decrease across recalculations (spec §7).
  const toPeak = (value: number | null) => (value === null ? null : Number(value));
  const previous: Record<string, { provisional_peak: number | null; verified_peak: number | null }> = {};
  for (const row of snapshots.data) {
    if (!(row.attribute in previous)) {
      previous[row.attribute] = { provisional_peak: toPeak(row.provisional_peak), verified_peak: toPeak(row.verified_peak) };
    }
  }

  const newestEvidence = evidence.data.at(-1)?.occurred_at ?? null;
  const weight =
    weights.data.find((w) => newestEvidence === null || w.measured_at <= newestEvidence) ?? weights.data.at(-1) ?? null;

  return {
    schema_version: 1,
    athlete: {
      id: athleteId,
      body_mass_kg: weight ? Number(weight.value) : null,
      height_cm: null,
      age_years: null,
      sex: null,
    },
    evidence: evidence.data.map((e) => ({
      id: e.id,
      test_key: e.test_key ?? "",
      source_type: e.source_type,
      occurred_at: e.occurred_at,
      raw_payload: e.raw_payload,
    })),
    gaps,
    ...(Object.keys(previous).length ? { previous: { attributes: previous } } : {}),
  };
}
