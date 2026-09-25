import {
  formatDuration,
  formatNumber,
  isAttemptColumn,
  type FieldSpec,
  type Side,
  type TestDefinition,
} from "@ascend/shared";
import type { AttemptRow } from "../data";

/** Display-only formatting of raw attempts (spec §45: no scoring in the UI). */

export function sideLabel(test: TestDefinition, side: Side): string | null {
  if (side === "none") return null;
  return test.sideLabels?.[side] ?? (side === "left" ? "Left" : "Right");
}

export function slotTitle(test: TestDefinition, side: Side, attemptNumber: number): string {
  const sideText = sideLabel(test, side);
  if (test.attempts.kind === "sets") return `${test.attemptLabel} ${attemptNumber}`;
  const multi = test.attempts.count > 1;
  if (sideText && !multi) return sideText;
  const base = multi ? `${test.attemptLabel} ${attemptNumber} of ${test.attempts.count}` : test.attemptLabel;
  return sideText ? `${base} · ${sideText}` : base;
}

function fieldValue(field: FieldSpec, attempt: AttemptRow): unknown {
  if (field.key === "side") return attempt.side === "none" ? null : attempt.side;
  const data = (attempt.data ?? {}) as Record<string, unknown>;
  if (field.kind === "load") {
    const kg = data.implement_kg;
    const count = data.implement_count;
    if (typeof kg !== "number") return attempt.load_kg;
    return count === 2 ? `2 × ${formatNumber(kg, 2)} kg` : `${formatNumber(kg, 2)} kg`;
  }
  if (isAttemptColumn(field.key)) return attempt[field.key];
  return data[field.key];
}

export function formatFieldValue(field: FieldSpec, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  switch (field.kind) {
    case "choice":
      return field.options.find((o) => o.value === raw)?.label ?? String(raw);
    case "rpe":
      return `RPE ${String(raw)}`;
    case "duration": {
      const seconds = Number(raw);
      if (!Number.isFinite(seconds)) return String(raw);
      return field.unit === "s_per_km" ? `${formatDuration(Math.round(seconds))} /km` : formatDuration(seconds);
    }
    case "load":
      return typeof raw === "number" ? `${formatNumber(raw, 2)} kg` : String(raw);
    case "number": {
      const value = Number(raw);
      if (field.key === "errors") return `${value} ${value === 1 ? "error" : "errors"}`;
      if (field.unit === "reps") return `${value} reps`;
      const unit = field.unit === "percent" ? "%" : ` ${field.unit}`;
      return `${formatNumber(value, field.decimals)}${unit}`;
    }
  }
}

/** One line per attempt, e.g. "Parallel · Grounded · Stable". */
export function summarizeAttempt(test: TestDefinition, attempt: AttemptRow): string {
  return test.attemptFields
    .filter((field) => field.key !== "side")
    .map((field) => formatFieldValue(field, fieldValue(field, attempt)))
    .filter((text): text is string => text !== null)
    .join(" · ");
}
