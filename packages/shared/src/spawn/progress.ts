import type { AttributeKey } from "../attributes";
import {
  TEST_CATALOG,
  isResultStatus,
  testsForSession,
  type ResultStatus,
  type Side,
  type TestDefinition,
  type TestKey,
} from "./catalog";
import type { SessionKind } from "./states";

/**
 * Progress through Spawn: which attempts are still missing, when a session is
 * complete, and how much of each attribute's evidence has been collected.
 * None of this is a score.
 */

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export interface AttemptSlot {
  side: Side;
  attemptNumber: number;
}

export interface AttemptKey {
  side: Side;
  attempt_number: number;
}

/**
 * Required slots of a fixed-attempt test, in protocol order. Sides alternate
 * per round (L1, R1, L2, R2) so one leg rests while the other works.
 */
export function fixedSlots(test: TestDefinition): AttemptSlot[] {
  if (test.attempts.kind !== "fixed") return [];
  const slots: AttemptSlot[] = [];
  for (let attemptNumber = 1; attemptNumber <= test.attempts.count; attemptNumber += 1) {
    for (const side of test.attempts.sides) slots.push({ side, attemptNumber });
  }
  return slots;
}

function hasAttempt(attempts: readonly AttemptKey[], slot: AttemptSlot): boolean {
  return attempts.some((a) => a.side === slot.side && a.attempt_number === slot.attemptNumber);
}

/** The next attempt to record, or null when the plan is satisfied/full. */
export function nextSlot(test: TestDefinition, attempts: readonly AttemptKey[]): AttemptSlot | null {
  if (test.attempts.kind === "fixed") {
    return fixedSlots(test).find((slot) => !hasAttempt(attempts, slot)) ?? null;
  }
  if (attempts.length >= test.attempts.max) return null;
  const highest = attempts.reduce((max, a) => Math.max(max, a.attempt_number), 0);
  return { side: "none", attemptNumber: highest + 1 };
}

export type Readiness = { ok: true } | { ok: false; reason: string };

/** Whether enough attempts exist to confirm the test. */
export function attemptsReady(test: TestDefinition, attempts: readonly AttemptKey[]): Readiness {
  if (test.attempts.kind === "fixed") {
    const missing = fixedSlots(test).filter((slot) => !hasAttempt(attempts, slot)).length;
    return missing === 0
      ? { ok: true }
      : { ok: false, reason: `${missing} ${missing === 1 ? "attempt" : "attempts"} still to record.` };
  }
  return attempts.length > 0 ? { ok: true } : { ok: false, reason: "Record at least one set." };
}

// ---------------------------------------------------------------------------
// Results and sessions
// ---------------------------------------------------------------------------

export interface ResultSummary {
  id: string;
  test_key: string;
  status: ResultStatus;
  started_at: string;
}

/** Narrows database rows (status is plain text there) to summaries. */
export function toResultSummaries(
  rows: ReadonlyArray<{ id: string; test_key: string; status: string; started_at: string }>,
): ResultSummary[] {
  return rows.flatMap((row) => (isResultStatus(row.status) ? [{ ...row, status: row.status }] : []));
}

/** Latest result per test: retries add rows and the newest one counts (ADR-014). */
export function latestResults<T extends ResultSummary>(results: readonly T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const result of results) {
    const current = latest.get(result.test_key);
    if (!current || result.started_at > current.started_at) latest.set(result.test_key, result);
  }
  return latest;
}

export type TestProgress = "not_started" | "in_progress" | ResultStatus;

export function testProgress(test: TestDefinition, results: readonly ResultSummary[]): TestProgress {
  const completed = results.find((r) => r.test_key === test.key && r.status === "completed");
  if (completed) return "completed";
  return latestResults(results).get(test.key)?.status ?? "not_started";
}

export function isResolved(progress: TestProgress): boolean {
  return progress !== "not_started" && progress !== "in_progress";
}

/** Every test has a resolved latest result. Mirrors the Postgres guard. */
export function isSessionComplete(kind: SessionKind, results: readonly ResultSummary[]): boolean {
  return testsForSession(kind).every((test) => isResolved(testProgress(test, results)));
}

/** First test that still needs work, in protocol order. */
export function nextTest(kind: SessionKind, results: readonly ResultSummary[]): TestDefinition | null {
  return testsForSession(kind).find((test) => !isResolved(testProgress(test, results))) ?? null;
}

// ---------------------------------------------------------------------------
// Data coverage (ADR-018)
// ---------------------------------------------------------------------------

interface Subdomain {
  label: string;
  tests: readonly TestKey[];
}

/**
 * §15 subdomains that Spawn can measure, mapped to Spawn tests. Subdomains
 * that need longer-term evidence (sleep trend, workload response, future
 * reactive agility…) are not listed: Spawn cannot collect them.
 */
export const SPAWN_SUBDOMAINS: Readonly<Record<AttributeKey, readonly Subdomain[]>> = {
  endurance: [
    { label: "Sustained locomotion", tests: ["E02", "E04"] },
    { label: "Pace and distance", tests: ["E04"] },
  ],
  strength: [
    { label: "Push", tests: ["F01"] },
    { label: "Knee dominant", tests: ["F02"] },
    { label: "Hinge", tests: ["F03"] },
    { label: "Pull", tests: ["F04"] },
    { label: "Carry and grip", tests: ["F05"] },
  ],
  power: [],
  core: [
    { label: "Anti-extension control", tests: ["M06"] },
    { label: "Bracing", tests: ["F06"] },
    { label: "Loaded stability", tests: ["F05"] },
  ],
  mobility: [
    { label: "Ankle", tests: ["M02"] },
    { label: "Hip and squat pattern", tests: ["M01"] },
    { label: "Shoulder", tests: ["M03"] },
    { label: "Posterior chain", tests: ["M05"] },
  ],
  agility: [
    { label: "Balance and control", tests: ["M04"] },
    { label: "Change of direction", tests: ["M07"] },
  ],
  recovery: [
    { label: "Resting baseline", tests: ["E01"] },
    { label: "Acute heart-rate recovery", tests: ["E03"] },
  ],
};

export type CoverageStatus = "collected" | "partial" | "not_assessed";

export interface AttributeCoverage {
  attribute: AttributeKey;
  status: CoverageStatus;
  covered: number;
  total: number;
}

/** How much of an attribute's Spawn evidence exists. Completed tests only. */
export function attributeCoverage(
  attribute: AttributeKey,
  completedTests: ReadonlySet<string>,
): AttributeCoverage {
  const subdomains = SPAWN_SUBDOMAINS[attribute];
  const covered = subdomains.filter((s) => s.tests.some((key) => completedTests.has(key))).length;
  const status: CoverageStatus =
    covered === 0 ? "not_assessed" : covered === subdomains.length ? "collected" : "partial";
  return { attribute, status, covered, total: subdomains.length };
}

/** Attributes a session contributes evidence to, in catalog order. */
export function attributesForSession(kind: SessionKind): AttributeKey[] {
  const keys = new Set(testsForSession(kind).map((test) => test.key));
  return (Object.keys(SPAWN_SUBDOMAINS) as AttributeKey[]).filter((attribute) =>
    SPAWN_SUBDOMAINS[attribute].some((s) => s.tests.some((key) => keys.has(key))),
  );
}

export function completedTestKeys(results: readonly ResultSummary[]): Set<string> {
  return new Set(results.filter((r) => r.status === "completed").map((r) => r.test_key));
}

/** Display name of a test key. */
export function testName(key: string): string {
  return key in TEST_CATALOG ? TEST_CATALOG[key as TestKey].name : key;
}
