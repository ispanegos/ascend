import "server-only";

import { ATTRIBUTE_KEYS, isAttributeKey, type AttributeKey, type StatStatus } from "@ascend/shared";
import { createClient } from "@/lib/supabase/server";

/** Latest derived Stats, read with the athlete's session (RLS: own rows only). */

export interface StatView {
  attribute: AttributeKey;
  current: number | null;
  peak: number | null;
  confidence: number;
  coverage: number;
  status: StatStatus;
  engineVersion: string;
  calculatedAt: string;
  evidenceIds: string[];
  trace: unknown;
}

export interface OverallView {
  current: number | null;
  confidence: number;
  status: StatStatus;
  participating: string[];
}

export interface AthleteStats {
  calculationId: string;
  engineVersion: string;
  calibrationStatus: string;
  calculatedAt: string;
  stats: Record<AttributeKey, StatView>;
  overall: OverallView;
}

function asStatus(value: string): StatStatus {
  return value === "verified" || value === "provisional" ? value : "unranked";
}

function toNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

export async function getLatestStats(userId: string): Promise<AthleteStats | null> {
  const supabase = await createClient();
  const { data: calculation } = await supabase
    .from("stat_calculations")
    .select("id, engine_version, created_at, engine:engine_version (calibration_status)")
    .eq("athlete_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!calculation) return null;

  const [snapshots, overall] = await Promise.all([
    supabase.from("stat_snapshots").select("*").eq("calculation_id", calculation.id),
    supabase.from("overall_snapshots").select("*").eq("calculation_id", calculation.id).maybeSingle(),
  ]);
  if (snapshots.error || !overall.data) return null;

  const stats = {} as Record<AttributeKey, StatView>;
  for (const row of snapshots.data) {
    if (!isAttributeKey(row.attribute)) continue;
    stats[row.attribute] = {
      attribute: row.attribute,
      current: toNumber(row.current),
      peak: toNumber(row.peak),
      confidence: Number(row.confidence),
      coverage: Number(row.coverage),
      status: asStatus(row.status),
      engineVersion: row.engine_version,
      calculatedAt: row.calculated_at,
      evidenceIds: row.evidence_ids,
      trace: row.trace,
    };
  }
  if (!ATTRIBUTE_KEYS.every((key) => key in stats)) return null;

  return {
    calculationId: calculation.id,
    engineVersion: calculation.engine_version,
    calibrationStatus: calculation.engine?.calibration_status ?? "provisional",
    calculatedAt: calculation.created_at,
    stats,
    overall: {
      current: toNumber(overall.data.current),
      confidence: Number(overall.data.confidence),
      status: asStatus(overall.data.status),
      participating: overall.data.participating,
    },
  };
}

export interface EvidenceView {
  id: string;
  testKey: string;
  occurredAt: string;
}

export interface StatDetail {
  stat: StatView;
  engineVersion: string;
  calibrationStatus: string;
  lastVerifiedAt: string | null;
  evidence: EvidenceView[];
}

export async function getStatDetail(userId: string, attribute: AttributeKey): Promise<StatDetail | null> {
  const latest = await getLatestStats(userId);
  if (!latest) return null;
  const stat = latest.stats[attribute];
  const supabase = await createClient();
  const [verified, evidence] = await Promise.all([
    supabase
      .from("stat_snapshots")
      .select("calculated_at")
      .eq("athlete_id", userId)
      .eq("attribute", attribute)
      .eq("status", "verified")
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    stat.evidenceIds.length
      ? supabase.from("performance_evidence").select("id, test_key, occurred_at").in("id", stat.evidenceIds).order("occurred_at")
      : Promise.resolve({ data: [] as Array<{ id: string; test_key: string | null; occurred_at: string }>, error: null }),
  ]);
  return {
    stat,
    engineVersion: latest.engineVersion,
    calibrationStatus: latest.calibrationStatus,
    lastVerifiedAt: verified.data?.calculated_at ?? null,
    evidence: (evidence.data ?? []).map((e) => ({ id: e.id, testKey: e.test_key ?? "", occurredAt: e.occurred_at })),
  };
}
