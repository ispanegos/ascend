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
  previous?: { attributes: Record<string, { peak: number | null }> };
}

export type StatStatusWire = "unranked" | "provisional" | "verified";

export interface EngineStat {
  attribute: string;
  current: number | null;
  peak: number | null;
  score: number | null;
  confidence: number;
  coverage: number;
  status: StatStatusWire;
  peak_updated: boolean;
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
