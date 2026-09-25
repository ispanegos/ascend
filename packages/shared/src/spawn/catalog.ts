import type { AttributeKey } from "../attributes";
import type { Unit } from "../units";
import type { SessionKind } from "./states";

/**
 * Spawn test catalog (spec §12–§14). Defines WHAT each test records; the web
 * app owns the instructional copy. Option sets and bounds the spec leaves
 * open are listed in ADR-017. No scoring lives here (spec §15, M3).
 */

export const PROTOCOL_VERSION = "0.1.0";

export const TEST_KEYS = [
  "M01", "M02", "M03", "M04", "M05", "M06", "M07",
  "F01", "F02", "F03", "F04", "F05", "F06",
  "E01", "E02", "E03", "E04",
] as const;

export type TestKey = (typeof TEST_KEYS)[number];

export function isTestKey(value: unknown): value is TestKey {
  return typeof value === "string" && (TEST_KEYS as readonly string[]).includes(value);
}

export type Side = "none" | "left" | "right";

export interface ChoiceOption {
  value: string;
  label: string;
}

/** Show a field only when another field (attempt or test level) has one of these values. */
export interface Condition {
  field: string;
  equals: readonly string[];
}

interface FieldBase {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
  showWhen?: Condition;
  /**
   * Test-level fields only: `setup` is asked before the attempts (e.g. push-up
   * type), `finish` on the confirm screen (e.g. why the athlete stopped).
   */
  stage?: "setup" | "finish";
}

export interface ChoiceFieldSpec extends FieldBase {
  kind: "choice";
  options: readonly ChoiceOption[];
}

export interface NumberFieldSpec extends FieldBase {
  kind: "number";
  unit: Unit;
  min: number;
  max: number;
  decimals: number;
  /**
   * For signed values: labels for [negative, positive]. Phone number pads
   * have no minus key, so the sign is chosen explicitly.
   */
  signLabels?: readonly [string, string];
  /**
   * Values outside this range but inside min/max are accepted only after the
   * athlete confirms them (ADR-023 §7). Typo protection, not physiology.
   */
  typical?: readonly [number, number];
}

export interface DurationFieldSpec extends FieldBase {
  kind: "duration";
  /** Seconds. */
  min: number;
  max: number;
  /** `s_per_km` renders as a pace. */
  unit: "s" | "s_per_km";
  /** Protocol duration offered as the starting value, e.g. 6:00 for E02. */
  defaultSeconds?: number;
  typical?: readonly [number, number];
}

export interface LoadFieldSpec extends FieldBase {
  kind: "load";
  /** `choose`: the athlete says whether one or two implements were used. */
  implementCount: "one" | "choose";
  defaultImplements?: 1 | 2;
}

export interface RpeFieldSpec extends FieldBase {
  kind: "rpe";
}

export type FieldSpec =
  | ChoiceFieldSpec
  | NumberFieldSpec
  | DurationFieldSpec
  | LoadFieldSpec
  | RpeFieldSpec;

export type AttemptPlan =
  | { kind: "fixed"; count: number; sides: readonly Side[] }
  | { kind: "sets"; max: number };

export interface TimerSpec {
  /** `execute`: one timer for the whole test. `attempt`: one per attempt. */
  placement: "execute" | "attempt";
  mode: "countdown" | "stopwatch";
  /** Countdown length or stopwatch cap, in seconds. */
  seconds: number;
  /** Duration field the timer result is offered to. */
  fillsField?: string;
  /** Seconds at which the athlete must take a reading (E03). */
  checkpoints?: readonly number[];
}

export interface TestDefinition {
  key: TestKey;
  session: SessionKind;
  name: string;
  primaryAttributes: readonly AttributeKey[];
  attempts: AttemptPlan;
  /** Label for one attempt row, e.g. "Attempt", "Set", "Side". */
  attemptLabel: string;
  sideLabels?: Partial<Record<Side, string>>;
  attemptFields: readonly FieldSpec[];
  /** Test-level fields. `variant` is stored in its own column. */
  resultFields: readonly FieldSpec[];
  timer?: TimerSpec;
  /** Suggested rest between attempts, offered as a countdown. */
  recoverySeconds?: number;
}

// ---------------------------------------------------------------------------
// Storage mapping
// ---------------------------------------------------------------------------

/** Attempt fields stored in typed columns (ADR-013). Everything else goes to `data`. */
export const ATTEMPT_COLUMNS = [
  "measure_cm",
  "duration_s",
  "distance_m",
  "load_kg",
  "reps",
  "rpe",
  "avg_hr_bpm",
  "max_hr_bpm",
  "avg_pace_s_per_km",
  "technique",
  "limiting_factor",
] as const;

export type AttemptColumn = (typeof ATTEMPT_COLUMNS)[number];

export function isAttemptColumn(key: string): key is AttemptColumn {
  return (ATTEMPT_COLUMNS as readonly string[]).includes(key);
}

// ---------------------------------------------------------------------------
// Approved vocabularies (ADR-023)
// ---------------------------------------------------------------------------

export const TECHNIQUE_VALUES = ["clean", "minor_compensation", "major_compensation", "stopped_for_technique"] as const;

/** One limiting-factor vocabulary for every test; each test exposes a subset. */
export const LIMITING_FACTORS = [
  "nothing",
  "breath",
  "muscular_fatigue",
  "grip",
  "technique",
  "pain",
  "pacing",
  "other",
] as const;

export type LimitingFactor = (typeof LIMITING_FACTORS)[number];

function factors(...entries: ReadonlyArray<readonly [LimitingFactor, string]>): ChoiceOption[] {
  return entries.map(([value, label]) => ({ value, label }));
}

// ---------------------------------------------------------------------------
// Shared field definitions
// ---------------------------------------------------------------------------

const TECHNIQUE: ChoiceFieldSpec = {
  kind: "choice",
  key: "technique",
  label: "Technique",
  required: true,
  options: [
    { value: "clean", label: "Clean" },
    { value: "minor_compensation", label: "Minor compensation" },
    { value: "major_compensation", label: "Major compensation" },
    { value: "stopped_for_technique", label: "Stopped for technique" },
  ],
};

const RPE: RpeFieldSpec = {
  kind: "rpe",
  key: "rpe",
  label: "Effort (RPE)",
  required: true,
  hint: "1 = very easy, 10 = maximal.",
};

const HR = (key: string, label: string, required = false, typical: readonly [number, number] = [40, 205]): NumberFieldSpec => ({
  kind: "number",
  key,
  label,
  unit: "bpm",
  min: 25,
  max: 250,
  decimals: 0,
  typical,
  required,
  ...(required ? {} : { hint: "Optional. From a watch or chest strap." }),
});

const PACE: DurationFieldSpec = {
  kind: "duration",
  key: "avg_pace_s_per_km",
  label: "Average pace",
  unit: "s_per_km",
  min: 180,
  max: 1800,
  required: false,
  hint: "Optional. As shown by your watch or app.",
};

const STRENGTH_STOP: ChoiceFieldSpec = {
  kind: "choice",
  key: "stop_reason",
  label: "Why did you stop adding load?",
  required: true,
  stage: "finish",
  options: factors(
    ["muscular_fatigue", "Effort got high"],
    ["technique", "Technique changed"],
    ["nothing", "Nothing — no heavier weight available"],
    ["pain", "Pain"],
    ["other", "Another reason"],
  ),
};

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const TEST_CATALOG: Readonly<Record<TestKey, TestDefinition>> = {
  // SPAWN 01 — MOVEMENT (§12)
  M01: {
    key: "M01",
    session: "movement",
    name: "Deep Squat",
    primaryAttributes: ["mobility"],
    attempts: { kind: "fixed", count: 3, sides: ["none"] },
    attemptLabel: "Attempt",
    attemptFields: [
      {
        kind: "choice",
        key: "depth",
        label: "Depth",
        required: true,
        options: [
          { value: "above_parallel", label: "Above parallel" },
          { value: "parallel", label: "Parallel" },
          { value: "below_parallel", label: "Below parallel" },
        ],
      },
      {
        kind: "choice",
        key: "heels",
        label: "Heels",
        required: true,
        options: [
          { value: "grounded", label: "Grounded" },
          { value: "lift", label: "Lifted" },
        ],
      },
      {
        kind: "choice",
        key: "control",
        label: "Control",
        required: true,
        options: [
          { value: "stable", label: "Stable" },
          { value: "compensation", label: "Compensation" },
          { value: "balance_loss", label: "Balance loss" },
        ],
      },
    ],
    resultFields: [],
  },
  M02: {
    key: "M02",
    session: "movement",
    name: "Ankle Wall Test",
    primaryAttributes: ["mobility"],
    attempts: { kind: "fixed", count: 1, sides: ["left", "right"] },
    attemptLabel: "Side",
    sideLabels: { left: "Left ankle", right: "Right ankle" },
    attemptFields: [
      {
        kind: "number",
        key: "measure_cm",
        label: "Toe-to-wall distance",
        unit: "cm",
        min: 0,
        max: 30,
        decimals: 1,
        typical: [0, 20],
        required: true,
        hint: "Furthest distance where your knee still touches the wall with the heel down.",
      },
    ],
    resultFields: [],
  },
  M03: {
    key: "M03",
    session: "movement",
    name: "Shoulder Mobility",
    primaryAttributes: ["mobility"],
    attempts: { kind: "fixed", count: 1, sides: ["left", "right"] },
    attemptLabel: "Side",
    sideLabels: { left: "Left hand on top", right: "Right hand on top" },
    attemptFields: [
      {
        kind: "choice",
        key: "reach",
        label: "Hands",
        required: true,
        options: [
          { value: "overlap", label: "Fingers overlap" },
          { value: "touch", label: "Fingertips touch" },
          { value: "within_hand", label: "Gap within a hand's length" },
          { value: "beyond_hand", label: "Gap beyond a hand's length" },
        ],
      },
      {
        kind: "number",
        key: "measure_cm",
        label: "Distance between fingertips",
        unit: "cm",
        min: -30,
        max: 60,
        decimals: 1,
        required: false,
        hint: "Optional, if you can measure it.",
        signLabels: ["Overlap", "Gap"],
      },
    ],
    resultFields: [],
  },
  M04: {
    key: "M04",
    session: "movement",
    name: "Single-Leg Balance",
    primaryAttributes: ["agility"],
    attempts: { kind: "fixed", count: 2, sides: ["left", "right"] },
    attemptLabel: "Attempt",
    sideLabels: { left: "Left leg", right: "Right leg" },
    attemptFields: [
      {
        kind: "duration",
        key: "duration_s",
        label: "Time balanced",
        unit: "s",
        min: 0,
        max: 60,
        required: true,
      },
    ],
    resultFields: [],
    timer: { placement: "attempt", mode: "stopwatch", seconds: 60, fillsField: "duration_s" },
  },
  M05: {
    key: "M05",
    session: "movement",
    name: "Sit & Reach",
    primaryAttributes: ["mobility"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Reach",
    attemptFields: [
      {
        kind: "number",
        key: "measure_cm",
        label: "Reach relative to your toes",
        unit: "cm",
        min: -50,
        max: 50,
        decimals: 1,
        required: true,
        hint: "0 means fingertips exactly at your toes.",
        signLabels: ["Short of toes", "At or past toes"],
      },
    ],
    resultFields: [],
  },
  M06: {
    key: "M06",
    session: "movement",
    name: "Dead Bug Control",
    primaryAttributes: ["core"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Set",
    attemptFields: [
      {
        kind: "choice",
        key: "quality",
        label: "How did the 10 reps per side go?",
        required: true,
        options: [
          { value: "clean", label: "Clean" },
          { value: "completed_with_compensation", label: "Completed with compensation" },
          { value: "unable", label: "Unable" },
        ],
      },
      {
        kind: "number",
        key: "reps",
        label: "Controlled reps per side",
        unit: "reps",
        min: 0,
        max: 10,
        decimals: 0,
        required: false,
        hint: "Optional. Reps with the lower back staying down.",
      },
    ],
    resultFields: [],
  },
  M07: {
    key: "M07",
    session: "movement",
    name: "Controlled Agility Baseline",
    primaryAttributes: ["agility"],
    attempts: { kind: "fixed", count: 3, sides: ["none"] },
    attemptLabel: "Attempt",
    attemptFields: [
      {
        kind: "duration",
        key: "duration_s",
        label: "Time",
        unit: "s",
        min: 1,
        max: 60,
        required: true,
      },
      {
        kind: "number",
        key: "errors",
        label: "Errors",
        unit: "reps",
        min: 0,
        max: 20,
        decimals: 0,
        required: true,
        hint: "Missed markers, wrong direction or crossed feet.",
      },
      {
        kind: "choice",
        key: "balance_loss",
        label: "Balance loss",
        required: true,
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
    ],
    resultFields: [],
    timer: { placement: "attempt", mode: "stopwatch", seconds: 60, fillsField: "duration_s" },
    recoverySeconds: 90,
  },

  // SPAWN 02 — FRAME (§13)
  F01: {
    key: "F01",
    session: "frame",
    name: "Push",
    primaryAttributes: ["strength"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Set",
    resultFields: [
      {
        kind: "choice",
        key: "variant",
        label: "Push-up type",
        required: true,
        options: [
          { value: "standard", label: "Standard" },
          { value: "incline", label: "Incline" },
        ],
      },
      {
        kind: "number",
        key: "incline_height_cm",
        label: "Hand height",
        unit: "cm",
        min: 10,
        max: 150,
        decimals: 0,
        required: true,
        hint: "Height of the surface under your hands.",
        showWhen: { field: "variant", equals: ["incline"] },
      },
    ],
    attemptFields: [
      { kind: "number", key: "reps", label: "Clean reps", unit: "reps", min: 0, max: 200, decimals: 0, typical: [0, 70], required: true },
      RPE,
      TECHNIQUE,
      {
        kind: "choice",
        key: "limiting_factor",
        label: "What stopped the set?",
        required: true,
        options: factors(
          ["technique", "Technique changed"],
          ["muscular_fatigue", "Muscle fatigue"],
          ["pain", "Pain"],
          ["other", "Another reason"],
        ),
      },
    ],
  },
  F02: {
    key: "F02",
    session: "frame",
    name: "Goblet Squat",
    primaryAttributes: ["strength"],
    attempts: { kind: "sets", max: 6 },
    attemptLabel: "Set",
    resultFields: [STRENGTH_STOP],
    attemptFields: [
      { kind: "load", key: "load_kg", label: "Load", implementCount: "one", required: true },
      {
        kind: "number",
        key: "reps",
        label: "Clean reps",
        unit: "reps",
        min: 0,
        max: 30,
        decimals: 0,
        required: true,
        hint: "Target 10 clean reps. Never to failure.",
      },
      RPE,
      TECHNIQUE,
    ],
  },
  F03: {
    key: "F03",
    session: "frame",
    name: "Hinge",
    primaryAttributes: ["strength"],
    attempts: { kind: "sets", max: 6 },
    attemptLabel: "Set",
    resultFields: [STRENGTH_STOP],
    attemptFields: [
      { kind: "load", key: "load_kg", label: "Load", implementCount: "choose", defaultImplements: 1, required: true },
      {
        kind: "number",
        key: "reps",
        label: "Clean reps",
        unit: "reps",
        min: 0,
        max: 30,
        decimals: 0,
        required: true,
        hint: "Target 10 clean reps. Never to failure.",
      },
      RPE,
      TECHNIQUE,
    ],
  },
  F04: {
    key: "F04",
    session: "frame",
    name: "Pull",
    primaryAttributes: ["strength"],
    attempts: { kind: "sets", max: 6 },
    attemptLabel: "Set",
    resultFields: [
      {
        kind: "choice",
        key: "variant",
        label: "Exercise",
        required: true,
        options: [
          { value: "bent_over_row", label: "Bent-over row" },
          { value: "pull_up", label: "Pull-up" },
        ],
      },
      {
        kind: "choice",
        key: "setup",
        label: "Setup",
        required: true,
        options: [
          { value: "bilateral", label: "Both arms together" },
          { value: "unilateral", label: "One arm at a time" },
        ],
        showWhen: { field: "variant", equals: ["bent_over_row"] },
      },
      STRENGTH_STOP,
    ],
    attemptFields: [
      {
        kind: "choice",
        key: "side",
        label: "Arm",
        required: true,
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
        showWhen: { field: "setup", equals: ["unilateral"] },
      },
      {
        kind: "load",
        key: "load_kg",
        label: "Load",
        implementCount: "choose",
        defaultImplements: 1,
        required: true,
        showWhen: { field: "variant", equals: ["bent_over_row"] },
      },
      { kind: "number", key: "reps", label: "Clean reps", unit: "reps", min: 0, max: 50, decimals: 0, required: true },
      RPE,
      TECHNIQUE,
    ],
  },
  F05: {
    key: "F05",
    session: "frame",
    name: "Farmer Carry",
    primaryAttributes: ["strength", "core"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Carry",
    resultFields: [],
    attemptFields: [
      {
        kind: "load",
        key: "load_kg",
        label: "Total load",
        implementCount: "choose",
        defaultImplements: 2,
        required: true,
      },
      { kind: "duration", key: "duration_s", label: "Duration", unit: "s", min: 0, max: 60, required: true },
      {
        kind: "number",
        key: "distance_m",
        label: "Distance",
        unit: "m",
        min: 0,
        max: 500,
        decimals: 1,
        required: false,
        hint: "Optional, if you measured the route.",
      },
      RPE,
      {
        kind: "choice",
        key: "limiting_factor",
        label: "What ended the carry?",
        required: true,
        options: factors(
          ["nothing", "Nothing — reached 60 s"],
          ["grip", "Grip failed"],
          ["technique", "Posture failed"],
          ["muscular_fatigue", "Muscle fatigue"],
          ["pain", "Pain"],
          ["other", "Another reason"],
        ),
      },
    ],
    timer: { placement: "attempt", mode: "stopwatch", seconds: 60, fillsField: "duration_s" },
  },
  F06: {
    key: "F06",
    session: "frame",
    name: "Plank",
    primaryAttributes: ["core"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Hold",
    resultFields: [],
    attemptFields: [
      { kind: "duration", key: "duration_s", label: "Hold time", unit: "s", min: 0, max: 120, required: true },
      RPE,
      {
        kind: "choice",
        key: "limiting_factor",
        label: "What ended the hold?",
        required: true,
        options: factors(
          ["nothing", "Nothing — reached 120 s"],
          ["technique", "Position lost"],
          ["muscular_fatigue", "Muscle fatigue"],
          ["pain", "Pain"],
          ["other", "Another reason"],
        ),
      },
    ],
    timer: { placement: "attempt", mode: "stopwatch", seconds: 120, fillsField: "duration_s" },
  },

  // SPAWN 03 — ENGINE (§14)
  E01: {
    key: "E01",
    session: "engine",
    name: "Resting Baseline",
    primaryAttributes: ["recovery"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Reading",
    resultFields: [],
    attemptFields: [
      {
        ...HR("avg_hr_bpm", "Average heart rate", false, [35, 110]),
        hint: "Optional. Leave empty if you don't wear a watch or strap.",
      },
    ],
    timer: { placement: "execute", mode: "countdown", seconds: 300 },
  },
  E02: {
    key: "E02",
    session: "engine",
    name: "6-Minute Brisk Walk",
    primaryAttributes: ["endurance"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Walk",
    resultFields: [],
    attemptFields: [
      {
        kind: "number",
        key: "distance_m",
        label: "Distance",
        unit: "m",
        min: 50,
        max: 1500,
        decimals: 1,
        typical: [250, 1000],
        required: true,
      },
      {
        kind: "duration",
        key: "duration_s",
        label: "Walking time",
        unit: "s",
        min: 60,
        max: 600,
        defaultSeconds: 360,
        required: true,
        hint: "6:00 unless you stopped early.",
      },
      HR("avg_hr_bpm", "Average heart rate"),
      HR("max_hr_bpm", "Maximum heart rate"),
      PACE,
      {
        kind: "number",
        key: "cadence_spm",
        label: "Cadence",
        unit: "spm",
        min: 40,
        max: 250,
        decimals: 0,
        required: false,
        hint: "Optional. Steps per minute.",
      },
    ],
    timer: { placement: "execute", mode: "countdown", seconds: 360, fillsField: "duration_s" },
  },
  E03: {
    key: "E03",
    session: "engine",
    name: "Heart-Rate Recovery",
    primaryAttributes: ["recovery"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Readings",
    resultFields: [],
    attemptFields: [
      HR("hr_stop_bpm", "At stop", true),
      HR("hr_1min_bpm", "After 1 minute", true),
      HR("hr_2min_bpm", "After 2 minutes", true),
    ],
    timer: { placement: "attempt", mode: "stopwatch", seconds: 150, checkpoints: [0, 60, 120] },
  },
  E04: {
    key: "E04",
    session: "engine",
    name: "20-Minute Run/Walk",
    primaryAttributes: ["endurance"],
    attempts: { kind: "fixed", count: 1, sides: ["none"] },
    attemptLabel: "Run/walk",
    resultFields: [],
    attemptFields: [
      {
        kind: "number",
        key: "distance_m",
        label: "Total distance",
        unit: "m",
        min: 200,
        max: 8000,
        decimals: 1,
        typical: [800, 6000],
        required: true,
      },
      {
        kind: "duration",
        key: "duration_s",
        label: "Total time",
        unit: "s",
        min: 60,
        max: 1800,
        defaultSeconds: 1200,
        required: true,
        hint: "20:00 unless you stopped early.",
      },
      PACE,
      HR("avg_hr_bpm", "Average heart rate"),
      HR("max_hr_bpm", "Maximum heart rate"),
      {
        kind: "duration",
        key: "run_time_s",
        label: "Time running",
        unit: "s",
        min: 0,
        max: 1800,
        required: false,
        hint: "Optional. Your best estimate is fine.",
      },
      {
        kind: "duration",
        key: "walk_time_s",
        label: "Time walking",
        unit: "s",
        min: 0,
        max: 1800,
        required: false,
      },
      RPE,
      {
        kind: "choice",
        key: "limiting_factor",
        label: "What limited you?",
        required: true,
        options: factors(
          ["breath", "Breath"],
          ["muscular_fatigue", "Legs / muscle fatigue"],
          ["pacing", "Pacing"],
          ["nothing", "Nothing — could continue"],
          ["pain", "Pain"],
          ["other", "Another reason"],
        ),
      },
    ],
    timer: { placement: "execute", mode: "countdown", seconds: 1200, fillsField: "duration_s" },
  },
};

export function testsForSession(kind: SessionKind): TestDefinition[] {
  return TEST_KEYS.map((key) => TEST_CATALOG[key]).filter((test) => test.session === kind);
}

export function getTest(key: string): TestDefinition | null {
  return isTestKey(key) ? TEST_CATALOG[key] : null;
}

// ---------------------------------------------------------------------------
// Session metadata (spec §12–§14)
// ---------------------------------------------------------------------------

export interface SessionDefinition {
  kind: SessionKind;
  number: "01" | "02" | "03";
  title: string;
  /** Estimated duration shown before the session starts. */
  estimate: string;
  /** Attributes the session primarily measures. */
  measures: readonly AttributeKey[];
}

export const SESSION_CATALOG: Readonly<Record<SessionKind, SessionDefinition>> = {
  movement: { kind: "movement", number: "01", title: "Movement", estimate: "25–30 min", measures: ["mobility", "agility", "core"] },
  frame: { kind: "frame", number: "02", title: "The Frame", estimate: "40–50 min", measures: ["strength", "core"] },
  // §14 gives no duration; ~45 min is the sum of the protocols plus transitions (ADR-017).
  engine: { kind: "engine", number: "03", title: "The Engine", estimate: "About 45 min", measures: ["endurance", "recovery"] },
};

// ---------------------------------------------------------------------------
// Skip / cannot perform / stop reasons (spec §53)
// ---------------------------------------------------------------------------

export const RESOLUTION_REASONS = [
  "cannot_perform_safely",
  "pain",
  "missing_equipment",
  "environment_unavailable",
  "does_not_know_technique",
  "other",
] as const;

export type ResolutionReason = (typeof RESOLUTION_REASONS)[number];

export const RESOLUTION_REASON_LABELS: Readonly<Record<ResolutionReason, string>> = {
  cannot_perform_safely: "I can't do it safely",
  pain: "Pain",
  missing_equipment: "Missing equipment",
  environment_unavailable: "No suitable space or route",
  does_not_know_technique: "I don't know the technique",
  other: "Other",
};

export type ResolvedStatus = "completed" | "skipped" | "cannot_perform" | "aborted";
export type ResultStatus = "in_progress" | ResolvedStatus;

const RESULT_STATUSES: readonly string[] = ["in_progress", "completed", "skipped", "cannot_perform", "aborted"];

export function isResultStatus(value: unknown): value is ResultStatus {
  return typeof value === "string" && RESULT_STATUSES.includes(value);
}

/**
 * Status for a test that ends without a completed result. A test stopped after
 * it started is `aborted`; otherwise the reason decides between "can't" and
 * "not now" (ADR-017).
 */
export function statusForReason(reason: ResolutionReason, started: boolean): Exclude<ResolvedStatus, "completed"> {
  if (started) return "aborted";
  return reason === "pain" || reason === "cannot_perform_safely" || reason === "does_not_know_technique"
    ? "cannot_perform"
    : "skipped";
}

export const PAIN_LOCATIONS: readonly ChoiceOption[] = [
  { value: "neck", label: "Neck" },
  { value: "shoulder", label: "Shoulder" },
  { value: "elbow_wrist", label: "Elbow / wrist" },
  { value: "upper_back", label: "Upper back" },
  { value: "lower_back", label: "Lower back" },
  { value: "hip", label: "Hip" },
  { value: "knee", label: "Knee" },
  { value: "ankle_foot", label: "Ankle / foot" },
  { value: "chest", label: "Chest" },
  { value: "other", label: "Other" },
];
