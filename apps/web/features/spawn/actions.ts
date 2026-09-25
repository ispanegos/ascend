"use server";

import {
  PAIN_LOCATIONS,
  PROTOCOL_VERSION,
  RESOLUTION_REASONS,
  SESSION_STATES,
  attemptsReady,
  buildAttemptRecord,
  buildResultPatch,
  getTest,
  isSessionComplete,
  isSessionKind,
  namesPainAsLimit,
  nextTest,
  sessionAvailability,
  statusForReason,
  testsForSession,
  toResultSummaries,
  type RawValues,
  type ResolutionReason,
  type SessionKind,
  type Side,
  type TestDefinition,
} from "@ascend/shared";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { devToolsEnabled } from "@/lib/dev";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getSpawnSnapshot } from "./data";
import { SPAWN_COMPLETE_PATH, sessionPath, testPath } from "./routing";
import { advanceSpawn, type ActionResult } from "./state";

/**
 * Assessment server actions (spec §11–§14, §53). Raw values are validated with
 * the shared catalog and written with the athlete's own session (RLS).
 * Postgres triggers enforce immutability, pain flags and evidence creation.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SAVE_FAILED: ActionResult = {
  ok: false,
  error: "That didn't save. Your entries are still here — check your connection and try again.",
};

const TEST_STEPS = ["intro", "execute", "record", "confirm"] as const;
type TestStep = (typeof TEST_STEPS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keeps only string values; the validators decide what the strings mean. */
function toRaw(value: unknown): RawValues {
  if (!isRecord(value)) return {};
  const raw: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) if (typeof entry === "string") raw[key] = entry;
  return raw;
}

async function context() {
  const user = await requireUser();
  const supabase = await createClient();
  return { user, supabase };
}

async function loadOpenSession(supabase: Supabase, sessionId: string) {
  const { data } = await supabase
    .from("assessment_sessions")
    .select("id, kind, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data || !isSessionKind(data.kind) || data.status !== "in_progress") return null;
  return { id: data.id, kind: data.kind };
}

async function loadOpenResult(supabase: Supabase, resultId: string) {
  const { data } = await supabase
    .from("assessment_results")
    .select("id, session_id, test_key, status, variant, data")
    .eq("id", resultId)
    .maybeSingle();
  const test = data ? getTest(data.test_key) : null;
  if (!data || !test || data.status !== "in_progress") return null;
  return { ...data, test };
}

/** Moves the resume pointer to the next unresolved test and returns where to go. */
async function advancePointer(supabase: Supabase, sessionId: string, kind: SessionKind): Promise<string> {
  const { data: results } = await supabase
    .from("assessment_results")
    .select("id, test_key, status, started_at")
    .eq("session_id", sessionId);
  const next = nextTest(kind, toResultSummaries(results ?? []));
  await supabase
    .from("assessment_sessions")
    .update({ current_test_key: next?.key ?? null, current_step: next ? "intro" : null })
    .eq("id", sessionId);
  return next ? testPath(kind, next.key) : sessionPath(kind);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Starts a Spawn session after the safety pre-flight (spec §53). */
export async function beginSession(kind: string, safetyAcknowledged: boolean): Promise<ActionResult> {
  if (!isSessionKind(kind)) return { ok: false, error: "Unknown session." };
  if (!safetyAcknowledged) return { ok: false, error: "Read and confirm the safety notes first." };

  const { user, supabase } = await context();
  const snapshot = await getSpawnSnapshot(user.id);
  const existing = snapshot.sessions.find((s) => s.kind === kind);
  if (existing) {
    return { ok: true, redirectTo: existing.current_test_key ? testPath(kind, existing.current_test_key) : sessionPath(kind) };
  }
  if (sessionAvailability(snapshot.state, kind) !== "available") {
    return { ok: false, error: "This session isn't available yet.", redirectTo: "/spawn" };
  }

  const first = testsForSession(kind)[0];
  const { error } = await supabase.from("assessment_sessions").insert({
    athlete_id: user.id,
    kind,
    purpose: "spawn",
    current_test_key: first?.key ?? null,
    current_step: "intro",
    safety_acknowledged_at: new Date().toISOString(),
  });
  // 23505: a parallel request created it first — that is the same outcome.
  if (error && error.code !== "23505") return SAVE_FAILED;

  const begin = SESSION_STATES[kind].beginEvent;
  if (begin) {
    const advanced = await advanceSpawn(supabase, user.id, begin, { allowAlreadyPast: true });
    if (!advanced.ok) return advanced;
  }
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: first ? testPath(kind, first.key) : sessionPath(kind) };
}

/** Finishes a session once every test is resolved; the athlete can still retry skips before this. */
export async function completeSession(sessionId: string): Promise<ActionResult> {
  const { user, supabase } = await context();
  const session = await loadOpenSession(supabase, sessionId);
  if (!session) return { ok: false, error: "This session is already finished.", redirectTo: "/" };

  const { data: results, error } = await supabase
    .from("assessment_results")
    .select("id, test_key, status, started_at")
    .eq("session_id", session.id);
  if (error) return SAVE_FAILED;
  if (!isSessionComplete(session.kind, toResultSummaries(results))) {
    return { ok: false, error: "Some tests still need a result or a reason." };
  }

  const { error: updateError } = await supabase
    .from("assessment_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString(), current_test_key: null, current_step: null })
    .eq("id", session.id);
  if (updateError) return SAVE_FAILED;

  const advanced = await advanceSpawn(supabase, user.id, SESSION_STATES[session.kind].completeEvent, {
    allowAlreadyPast: true,
  });
  if (!advanced.ok) return advanced;
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: sessionPath(session.kind) };
}

/** Remembers which test and step the athlete is on (resume pointer). */
export async function rememberTestStep(sessionId: string, testKey: string, step: string): Promise<void> {
  if (!(TEST_STEPS as readonly string[]).includes(step) || !getTest(testKey)) return;
  const { supabase } = await context();
  await supabase
    .from("assessment_sessions")
    .update({ current_test_key: testKey, current_step: step as TestStep })
    .eq("id", sessionId)
    .eq("status", "in_progress");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/** Opens (or reuses) the in-progress result for a test. Returns its id. */
export async function startTest(sessionId: string, testKey: string): Promise<ActionResult> {
  const test = getTest(testKey);
  if (!test) return { ok: false, error: "Unknown test." };
  const { user, supabase } = await context();
  const session = await loadOpenSession(supabase, sessionId);
  if (!session || session.kind !== test.session) return { ok: false, error: "This session is not open.", redirectTo: "/" };

  const { data: existing } = await supabase
    .from("assessment_results")
    .select("id, status")
    .eq("session_id", session.id)
    .eq("test_key", test.key)
    .in("status", ["in_progress", "completed"]);
  if (existing?.some((r) => r.status === "completed")) {
    return { ok: false, error: "This test is already recorded.", redirectTo: sessionPath(session.kind) };
  }
  const open = existing?.find((r) => r.status === "in_progress");
  if (open) return { ok: true, id: open.id };

  const { data, error } = await supabase
    .from("assessment_results")
    .insert({ athlete_id: user.id, session_id: session.id, test_key: test.key, protocol_version: PROTOCOL_VERSION })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("assessment_results")
        .select("id")
        .eq("session_id", session.id)
        .eq("test_key", test.key)
        .eq("status", "in_progress")
        .maybeSingle();
      if (raced) return { ok: true, id: raced.id };
    }
    return SAVE_FAILED;
  }
  return { ok: true, id: data.id };
}

async function saveSetupFields(supabase: Supabase, test: TestDefinition, resultId: string, resultRaw: RawValues, currentData: Json) {
  const setupFields = test.resultFields.filter((field) => (field.stage ?? "setup") === "setup");
  if (setupFields.length === 0) return { ok: true as const };
  const patch = buildResultPatch({ ...test, resultFields: setupFields }, resultRaw);
  if (!patch.ok) return { ok: false as const, errors: patch.errors };
  const data = { ...(isRecord(currentData) ? currentData : {}), ...patch.record.data };
  const { error } = await supabase
    .from("assessment_results")
    .update({ variant: patch.record.variant, data })
    .eq("id", resultId);
  return error ? { ok: false as const, errors: {} } : { ok: true as const };
}

export interface AttemptInput {
  resultId: string;
  /** Existing attempt being edited, if any. */
  attemptId?: string | undefined;
  side: Side;
  attemptNumber: number;
  raw: Record<string, string>;
  resultRaw: Record<string, string>;
}

/** Saves one attempt/set/side. Only possible while the result is in progress. */
export async function saveAttempt(input: AttemptInput): Promise<ActionResult> {
  const { user, supabase } = await context();
  const result = await loadOpenResult(supabase, input.resultId);
  if (!result) return { ok: false, error: "This test is already confirmed and can't be changed." };
  const { test } = result;

  if (!Number.isInteger(input.attemptNumber) || input.attemptNumber < 1 || input.attemptNumber > 20) {
    return { ok: false, error: "Unknown attempt." };
  }
  const slotSide: Side = input.side === "left" || input.side === "right" ? input.side : "none";
  if (test.attempts.kind === "fixed" && !test.attempts.sides.includes(slotSide)) {
    return { ok: false, error: "Unknown side." };
  }

  const resultRaw = toRaw(input.resultRaw);
  const setup = await saveSetupFields(supabase, test, result.id, resultRaw, result.data);
  if (!setup.ok) return { ok: false, error: "Check the test setup above.", fieldErrors: setup.errors };

  const built = buildAttemptRecord(test, toRaw(input.raw), resultRaw, slotSide);
  if (!built.ok) return { ok: false, error: "Check the highlighted fields.", fieldErrors: built.errors };
  const { record } = built;

  const row = {
    ...record.columns,
    data: record.data,
    recorded_at: new Date().toISOString(),
  };

  if (input.attemptId) {
    const { data: existing } = await supabase
      .from("assessment_attempts")
      .select("id, side, attempt_number")
      .eq("id", input.attemptId)
      .eq("result_id", result.id)
      .maybeSingle();
    if (!existing) return { ok: false, error: "That attempt no longer exists." };
    if (existing.side === record.side) {
      const { error } = await supabase.from("assessment_attempts").update(row).eq("id", existing.id);
      return error ? SAVE_FAILED : { ok: true, id: existing.id };
    }
    // Side is part of the attempt's identity: replace the row.
    const { error } = await supabase.from("assessment_attempts").delete().eq("id", existing.id);
    if (error) return SAVE_FAILED;
  }

  // Same slot saved again (e.g. a retry after a dropped connection): update it.
  const { data: sameSlot } = await supabase
    .from("assessment_attempts")
    .select("id")
    .eq("result_id", result.id)
    .eq("side", record.side)
    .eq("attempt_number", input.attemptNumber)
    .maybeSingle();
  if (sameSlot) {
    const { error } = await supabase.from("assessment_attempts").update(row).eq("id", sameSlot.id);
    return error ? SAVE_FAILED : { ok: true, id: sameSlot.id };
  }

  const { data, error } = await supabase
    .from("assessment_attempts")
    .insert({
      ...row,
      athlete_id: user.id,
      result_id: result.id,
      side: record.side,
      attempt_number: input.attemptNumber,
    })
    .select("id")
    .single();
  return error ? SAVE_FAILED : { ok: true, id: data.id };
}

export async function deleteAttempt(attemptId: string): Promise<ActionResult> {
  const { supabase } = await context();
  const { error, count } = await supabase.from("assessment_attempts").delete({ count: "exact" }).eq("id", attemptId);
  if (error) return { ok: false, error: "This attempt is part of a confirmed result and can't be removed." };
  return count === 0 ? { ok: false, error: "That attempt no longer exists." } : { ok: true };
}

export interface PainInput {
  reported: boolean;
  location: string;
  note: string;
}

function validatePain(pain: unknown): { ok: true; value: PainInput } | { ok: false; error: string } {
  if (!isRecord(pain)) return { ok: true, value: { reported: false, location: "", note: "" } };
  const reported = pain.reported === true;
  const location = typeof pain.location === "string" ? pain.location : "";
  const note = typeof pain.note === "string" ? pain.note.trim() : "";
  if (location && !PAIN_LOCATIONS.some((option) => option.value === location)) {
    return { ok: false, error: "Choose where you felt pain." };
  }
  if (note.length > 500) return { ok: false, error: "Keep the note under 500 characters." };
  return { ok: true, value: { reported, location, note } };
}

/** Confirms a test. After this the result and its attempts are immutable (ADR-014). */
export async function confirmResult(
  resultId: string,
  resultRawInput: Record<string, string>,
  painInput: PainInput,
): Promise<ActionResult> {
  const { supabase } = await context();
  const result = await loadOpenResult(supabase, resultId);
  if (!result) return { ok: false, error: "This test is already confirmed.", redirectTo: "/" };
  const { test } = result;

  const { data: attempts, error: attemptsError } = await supabase
    .from("assessment_attempts")
    .select("side, attempt_number, limiting_factor, data")
    .eq("result_id", result.id);
  if (attemptsError) return SAVE_FAILED;

  const ready = attemptsReady(
    test,
    attempts.map((a) => ({ side: a.side as Side, attempt_number: a.attempt_number })),
  );
  if (!ready.ok) return { ok: false, error: ready.reason };

  const patch = buildResultPatch(test, toRaw(resultRawInput));
  if (!patch.ok) return { ok: false, error: "Check the highlighted fields.", fieldErrors: patch.errors };

  const pain = validatePain(painInput);
  if (!pain.ok) return { ok: false, error: pain.error };

  const namedPain = namesPainAsLimit([
    patch.record.data,
    ...attempts.map((a) => ({ limiting_factor: a.limiting_factor })),
  ]);
  if (namedPain && !pain.value.reported) {
    // Never silently change input: the confirm screen shows this switched on.
    return { ok: false, error: "You named pain as a limit. Keep the pain flag on to confirm." };
  }

  const { error } = await supabase
    .from("assessment_results")
    .update({
      variant: patch.record.variant,
      data: { ...(isRecord(result.data) ? result.data : {}), ...patch.record.data },
      pain_reported: pain.value.reported,
      pain_location: pain.value.reported ? pain.value.location || null : null,
      pain_note: pain.value.reported ? pain.value.note || null : null,
      status: "completed",
    })
    .eq("id", result.id)
    .eq("status", "in_progress");
  if (error) return SAVE_FAILED;

  const session = await loadOpenSession(supabase, result.session_id);
  const redirectTo = session ? await advancePointer(supabase, session.id, session.kind) : "/";
  revalidatePath("/spawn", "layout");
  return { ok: true, redirectTo };
}

export interface ResolveInput {
  sessionId: string;
  testKey: string;
  reason: string;
  note: string;
  painLocation: string;
}

/** Skip, cannot perform, or stop a test with a reason (spec §53). Never a zero. */
export async function resolveTest(input: ResolveInput): Promise<ActionResult> {
  const test = getTest(input.testKey);
  if (!test) return { ok: false, error: "Unknown test." };
  if (!(RESOLUTION_REASONS as readonly string[]).includes(input.reason)) {
    return { ok: false, error: "Choose a reason.", fieldErrors: { reason: "Choose a reason." } };
  }
  const reason = input.reason as ResolutionReason;
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 500) return { ok: false, error: "Keep the note under 500 characters." };
  if (reason === "other" && note === "") {
    return { ok: false, error: "Add a short note.", fieldErrors: { note: "Say what happened." } };
  }
  const painLocation = reason === "pain" && PAIN_LOCATIONS.some((o) => o.value === input.painLocation)
    ? input.painLocation
    : null;

  const { user, supabase } = await context();
  const session = await loadOpenSession(supabase, input.sessionId);
  if (!session || session.kind !== test.session) return { ok: false, error: "This session is not open.", redirectTo: "/" };

  const { data: open } = await supabase
    .from("assessment_results")
    .select("id")
    .eq("session_id", session.id)
    .eq("test_key", test.key)
    .eq("status", "in_progress")
    .maybeSingle();

  const fields = {
    status: statusForReason(reason, Boolean(open)),
    reason_code: reason,
    reason_note: note || null,
    pain_reported: reason === "pain",
    pain_location: painLocation,
    pain_note: reason === "pain" ? note || null : null,
  };

  const { error } = open
    ? await supabase.from("assessment_results").update(fields).eq("id", open.id)
    : await supabase.from("assessment_results").insert({
        ...fields,
        athlete_id: user.id,
        session_id: session.id,
        test_key: test.key,
        protocol_version: PROTOCOL_VERSION,
      });
  if (error) {
    return error.code === "23514"
      ? { ok: false, error: "This test is already recorded.", redirectTo: sessionPath(session.kind) }
      : SAVE_FAILED;
  }

  const redirectTo = await advancePointer(supabase, session.id, session.kind);
  revalidatePath("/spawn", "layout");
  return { ok: true, redirectTo };
}

/** Tries a skipped or stopped test again. The earlier result stays as history. */
export async function retryTest(sessionId: string, testKey: string): Promise<ActionResult> {
  const test = getTest(testKey);
  if (!test) return { ok: false, error: "Unknown test." };
  const started = await startTest(sessionId, testKey);
  if (!started.ok) return started;
  await rememberTestStep(sessionId, test.key, "intro");
  revalidatePath("/spawn", "layout");
  return { ok: true, redirectTo: testPath(test.session, test.key) };
}

// ---------------------------------------------------------------------------
// Spawn Complete
// ---------------------------------------------------------------------------

/**
 * Temporary Milestone 2 action behind "INITIALIZE ATHLETE PROFILE". Marks
 * Spawn as waiting for calibration; Milestone 3 replaces this with a call to
 * the Stats Engine. It computes nothing.
 */
export async function requestCalibration(): Promise<ActionResult> {
  const { user, supabase } = await context();
  const result = await advanceSpawn(supabase, user.id, "REQUEST_CALIBRATION", {
    allowAlreadyPast: true,
    patch: { calibration_requested_at: new Date().toISOString() },
  });
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: SPAWN_COMPLETE_PATH };
}

// ---------------------------------------------------------------------------
// Development only (ADR-019)
// ---------------------------------------------------------------------------

export async function devResetSpawn(keepContext: boolean): Promise<ActionResult> {
  if (!devToolsEnabled()) return { ok: false, error: "Not available." };
  const { supabase } = await context();
  const { error } = await supabase.rpc("dev_reset_spawn", { keep_context: keepContext === true });
  if (error) return { ok: false, error: `Reset refused: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/" };
}
