/** Wire format of the ASCEND Engine (engine/ascend_engine/engine.py). */

export interface EngineInput {
  schema_version: 1;
  athlete: {
    id: string;
    body_mass_kg: number | null;
    height_cm: number | null;
    age_years: number | null;
    sex: string | null;
  };
  evidence: Array<{
    id: string;
    test_key: string;
    source_type: string;
    occurred_at: string;
    raw_payload: unknown;
  }>;
  gaps: Array<{ test_key: string; status: string; reason_code: string | null }>;
  previous?: { attributes: Record<string, { provisional_peak: number | null; verified_peak: number | null }> };
}

export type StatStatusWire = "unranked" | "provisional" | "verified";

export interface EngineStat {
  attribute: string;
  current: number | null;
  provisional_peak: number | null;
  verified_peak: number | null;
  verified_peak_updated: boolean;
  score: number | null;
  confidence: number;
  uncapped_confidence: number;
  coverage: number;
  status: StatStatusWire;
  verification_eligible: boolean;
  evidence_ids: string[];
  trace: Record<string, unknown>;
}

export interface EngineOutput {
  engine_version: string;
  config_hash: string;
  calibration_status: string;
  input_hash: string;
  as_of: string;
  athlete_id: string;
  attributes: Record<string, EngineStat>;
  overall: {
    current: number | null;
    confidence: number;
    status: StatStatusWire;
    participating: string[];
    trace: Record<string, unknown>;
  };
  gaps: Array<{ test_key: string; status: string; reason_code: string | null }>;
  evidence_ids: string[];
}

/** Input to `suggest-paths` (ADR-041): only what ASCEND knows. */
export interface PathSuggestionInput {
  stats: Record<string, { current: number | null; confidence: number; status: StatStatusWire }>;
}

export interface PathSuggestion {
  attribute: string;
  priority: "primary" | "secondary";
  reason: string;
  basis: { current: number | null; confidence: number; profile_median: number | null; gap: number | null };
}

export interface PathSuggestionOutput {
  rules_version: string;
  suggestions: PathSuggestion[];
  notes: string[];
}
