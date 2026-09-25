import { parseDecimal, parseDuration } from "../units";
import {
  isAttemptColumn,
  type AttemptColumn,
  type FieldSpec,
  type Side,
  type TestDefinition,
} from "./catalog";

/**
 * Validation and storage mapping for Spawn test fields. The same functions run
 * in the browser (instant feedback) and on the server (authoritative).
 */

/** Raw form input: every value is the string the athlete entered or chose. */
export type RawValues = Readonly<Record<string, string>>;
export type FieldErrors = Record<string, string>;

export interface LoadValue {
  totalKg: number;
  implementCount: 1 | 2;
  implementKg: number;
}

export type FieldValue = string | number | LoadValue;
export type ParsedValues = Record<string, FieldValue | null>;

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

export function isVisible(field: FieldSpec, context: RawValues): boolean {
  if (!field.showWhen) return true;
  const value = context[field.showWhen.field] ?? "";
  return field.showWhen.equals.includes(value);
}

export function visibleFields(fields: readonly FieldSpec[], context: RawValues): FieldSpec[] {
  return fields.filter((field) => isVisible(field, context));
}

// ---------------------------------------------------------------------------
// Load encoding: "<implements>x<kg per implement>", e.g. "2x16"
// ---------------------------------------------------------------------------

export function encodeLoad(implementCount: 1 | 2, implementKg: string): string {
  return implementKg.trim() === "" ? "" : `${implementCount}x${implementKg.trim()}`;
}

export function decodeLoad(raw: string | undefined): { implementCount: 1 | 2; implementKg: string } | null {
  if (!raw) return null;
  const match = /^([12])x(.+)$/.exec(raw);
  if (!match) return null;
  return { implementCount: match[1] === "2" ? 2 : 1, implementKg: match[2] ?? "" };
}

function parseLoad(raw: string, required: boolean): { value: LoadValue | null; error?: string } {
  if (raw.trim() === "") return required ? { value: null, error: "Choose the load you used." } : { value: null };
  const decoded = decodeLoad(raw);
  if (!decoded) return { value: null, error: "Choose the load you used." };
  const parsed = parseDecimal(decoded.implementKg, { min: 0.5, max: 250, decimals: 2, unit: "kg" });
  if (!parsed.ok) return { value: null, error: parsed.error };
  if (parsed.value === null) return { value: null, error: "Choose the load you used." };
  return {
    value: {
      implementCount: decoded.implementCount,
      implementKg: parsed.value,
      totalKg: Math.round(parsed.value * decoded.implementCount * 100) / 100,
    },
  };
}

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

function validateField(field: FieldSpec, raw: string): { value: FieldValue | null; error?: string } {
  const text = raw.trim();

  switch (field.kind) {
    case "choice": {
      if (text === "") return field.required ? { value: null, error: "Choose one." } : { value: null };
      if (!field.options.some((option) => option.value === text)) {
        return { value: null, error: "Choose one of the options." };
      }
      return { value: text };
    }
    case "rpe": {
      if (text === "") return field.required ? { value: null, error: "Choose your effort." } : { value: null };
      const parsed = parseDecimal(text, { min: 1, max: 10, decimals: 0 });
      return parsed.ok ? { value: parsed.value } : { value: null, error: parsed.error };
    }
    case "number": {
      const parsed = parseDecimal(text, field);
      if (!parsed.ok) return { value: null, error: parsed.error };
      if (parsed.value === null && field.required) return { value: null, error: "Required." };
      return { value: parsed.value };
    }
    case "duration": {
      const parsed = parseDuration(text, field);
      if (!parsed.ok) return { value: null, error: parsed.error };
      if (parsed.value === null && field.required) return { value: null, error: "Required." };
      return { value: parsed.value };
    }
    case "load":
      return parseLoad(text, field.required);
  }
}

/**
 * Validates the visible fields. `context` supplies values for `showWhen`
 * conditions that live on another level (e.g. an attempt field shown only
 * for a test-level setup choice).
 */
export function validateFields(
  fields: readonly FieldSpec[],
  raw: RawValues,
  context: RawValues = {},
): { values: ParsedValues; errors: FieldErrors } {
  const merged: RawValues = { ...context, ...raw };
  const values: ParsedValues = {};
  const errors: FieldErrors = {};

  for (const field of visibleFields(fields, merged)) {
    const { value, error } = validateField(field, raw[field.key] ?? "");
    if (error) errors[field.key] = error;
    else values[field.key] = value;
  }
  return { values, errors };
}

function asNumber(value: FieldValue | null | undefined): number | null {
  return typeof value === "number" ? value : null;
}

/** Rules that span two fields. They report errors, never adjust values. */
export function crossFieldErrors(values: ParsedValues): FieldErrors {
  const errors: FieldErrors = {};
  const avg = asNumber(values.avg_hr_bpm);
  const max = asNumber(values.max_hr_bpm);
  if (avg !== null && max !== null && max < avg) {
    errors.max_hr_bpm = "Maximum heart rate can't be lower than the average.";
  }

  const run = asNumber(values.run_time_s);
  const walk = asNumber(values.walk_time_s);
  const total = asNumber(values.duration_s);
  if (total !== null && (run ?? 0) + (walk ?? 0) > total) {
    errors.walk_time_s = "Running and walking time add up to more than the total time.";
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Storage mapping
// ---------------------------------------------------------------------------

export type JsonValue = string | number | boolean | null;

type TextColumn = "technique" | "limiting_factor";
const TEXT_COLUMNS: readonly string[] = ["technique", "limiting_factor"] satisfies TextColumn[];

export type AttemptColumns = { [K in Exclude<AttemptColumn, TextColumn>]?: number | null } & {
  [K in TextColumn]?: string | null;
};

export interface AttemptRecord {
  side: Side;
  columns: AttemptColumns;
  data: Record<string, JsonValue>;
}

function setColumn(columns: AttemptColumns, key: AttemptColumn, value: string | number | null): void {
  if (TEXT_COLUMNS.includes(key)) {
    (columns as Record<string, string | null>)[key] = typeof value === "string" ? value : null;
  } else {
    (columns as Record<string, number | null>)[key] = typeof value === "number" ? value : null;
  }
}

/**
 * Derived readings the spec asks to store next to the raw ones (§14 E03:
 * "store absolute drops and raw readings").
 */
function derivedData(test: TestDefinition, values: ParsedValues): Record<string, JsonValue> {
  if (test.key !== "E03") return {};
  const stop = asNumber(values.hr_stop_bpm);
  const oneMin = asNumber(values.hr_1min_bpm);
  const twoMin = asNumber(values.hr_2min_bpm);
  return {
    drop_1min_bpm: stop !== null && oneMin !== null ? stop - oneMin : null,
    drop_2min_bpm: stop !== null && twoMin !== null ? stop - twoMin : null,
  };
}

export type BuildResult<T> = { ok: true; record: T } | { ok: false; errors: FieldErrors };

export function buildAttemptRecord(
  test: TestDefinition,
  raw: RawValues,
  resultRaw: RawValues,
  defaultSide: Side,
): BuildResult<AttemptRecord> {
  const { values, errors } = validateFields(test.attemptFields, raw, resultRaw);
  Object.assign(errors, crossFieldErrors(values));
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const record: AttemptRecord = { side: defaultSide, columns: {}, data: {} };
  for (const [key, value] of Object.entries(values)) {
    if (key === "side") {
      record.side = value === "left" || value === "right" ? value : "none";
    } else if (value !== null && typeof value === "object") {
      // Load: total in the column, what was actually held in data.
      record.columns.load_kg = value.totalKg;
      record.data.implement_count = value.implementCount;
      record.data.implement_kg = value.implementKg;
    } else if (isAttemptColumn(key)) {
      setColumn(record.columns, key, value);
    } else {
      record.data[key] = value;
    }
  }
  Object.assign(record.data, derivedData(test, values));
  return { ok: true, record };
}

export interface ResultPatch {
  variant: string | null;
  data: Record<string, JsonValue>;
}

export function buildResultPatch(test: TestDefinition, raw: RawValues): BuildResult<ResultPatch> {
  const { values, errors } = validateFields(test.resultFields, raw);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const patch: ResultPatch = { variant: null, data: {} };
  for (const [key, value] of Object.entries(values)) {
    if (key === "variant") patch.variant = typeof value === "string" ? value : null;
    else if (typeof value !== "object" || value === null) patch.data[key] = value;
  }
  return { ok: true, record: patch };
}

/** Converts a stored attempt back into raw form values, for editing. */
export function attemptToRaw(
  test: TestDefinition,
  stored: { side: Side; data: Record<string, unknown> } & Partial<Record<AttemptColumn, number | string | null>>,
): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const field of test.attemptFields) {
    if (field.key === "side") {
      if (stored.side !== "none") raw.side = stored.side;
      continue;
    }
    if (field.kind === "load") {
      const count = stored.data.implement_count === 2 ? 2 : 1;
      const kg = stored.data.implement_kg;
      if (typeof kg === "number") raw[field.key] = encodeLoad(count, String(kg));
      continue;
    }
    const value = isAttemptColumn(field.key) ? stored[field.key] : stored.data[field.key];
    if (value !== null && value !== undefined) raw[field.key] = String(value);
  }
  return raw;
}

/** Converts stored test-level data back into raw form values. */
export function resultToRaw(
  test: TestDefinition,
  stored: { variant: string | null; data: Record<string, unknown> },
): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const field of test.resultFields) {
    const value = field.key === "variant" ? stored.variant : stored.data[field.key];
    if (value !== null && value !== undefined) raw[field.key] = String(value);
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Pain
// ---------------------------------------------------------------------------

const PAIN_KEYS = ["limiting_factor", "stop_reason"] as const;

/** True when the athlete named pain as what limited or stopped the test (ADR-016). */
export function namesPainAsLimit(values: ReadonlyArray<Readonly<Record<string, unknown>>>): boolean {
  return values.some((record) => PAIN_KEYS.some((key) => record[key] === "pain"));
}

/**
 * Values outside a field's typical range (ADR-023 §7). They are valid, but
 * the athlete must confirm them before saving. Nothing is clamped.
 */
export function unusualValues(fields: readonly FieldSpec[], values: ParsedValues): FieldErrors {
  const unusual: FieldErrors = {};
  for (const field of fields) {
    if ((field.kind !== "number" && field.kind !== "duration") || !field.typical) continue;
    const value = values[field.key];
    if (typeof value !== "number") continue;
    const [low, high] = field.typical;
    if (value < low || value > high) {
      const unit = field.kind === "duration" ? "" : field.unit === "reps" ? " reps" : ` ${field.unit}`;
      unusual[field.key] = `${value}${unit} is unusual for this test. Check it — if it's right, confirm to save.`;
    }
  }
  return unusual;
}
