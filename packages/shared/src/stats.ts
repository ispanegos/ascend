import type { AttributeKey } from "./attributes";

/** Spec §6: UNRANKED when score is null, otherwise by confidence. */
export type StatStatus = "unranked" | "provisional" | "verified";

/**
 * Spec §3 stat shape. Values are produced by the ASCEND engine only
 * (spec §45); the frontend never derives them.
 */
export interface AthleteStat {
  attribute: AttributeKey;
  /** Internal decimal 0..100; null means unknown, never zero. */
  current: number | null;
  /** Internal decimal 0..100; highest verified Current, never decays. */
  peak: number | null;
  /** 0..1 certainty of the estimate, not ability. */
  confidence: number;
  status: StatStatus;
  engineVersion: string;
  calculatedAt: string;
}
