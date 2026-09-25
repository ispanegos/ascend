import "server-only";

import {
  isSessionKind,
  isSpawnState,
  type SessionKind,
  type Side,
  type SpawnState,
  type TestDefinition,
} from "@ascend/shared";
import { cache } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SessionPointer } from "./routing";

/**
 * Spawn data access. Every query runs with the athlete's session, so RLS
 * scopes it to their own rows (spec §48). Callers verify the user first.
 */

export type SettingsRow = Tables<"athlete_settings">;
export type ProfileRow = Tables<"profiles">;
export type SessionRow = Tables<"assessment_sessions">;
export type ResultRow = Tables<"assessment_results">;
export type AttemptRow = Tables<"assessment_attempts">;
export type EquipmentRow = Tables<"equipment">;
export type AthleteEquipmentRow = Tables<"athlete_equipment">;
export type AvailabilityRow = Tables<"availability_windows">;
export type BodyMeasurementRow = Tables<"body_measurements">;

export class DataError extends Error {}

function fail(what: string, error: { message: string } | null): never {
  throw new DataError(`${what}: ${error?.message ?? "unknown error"}`);
}

export interface SpawnSnapshot {
  state: SpawnState;
  settings: SettingsRow;
  sessions: SessionRow[];
}

/** Spawn state + sessions. Deduplicated per request. */
export const getSpawnSnapshot = cache(async (userId: string): Promise<SpawnSnapshot> => {
  const supabase = await createClient();
  const [settings, sessions] = await Promise.all([
    supabase.from("athlete_settings").select("*").eq("athlete_id", userId).single(),
    supabase.from("assessment_sessions").select("*").eq("athlete_id", userId).eq("purpose", "spawn"),
  ]);
  if (settings.error) fail("Loading Spawn state", settings.error);
  if (sessions.error) fail("Loading sessions", sessions.error);
  const state = isSpawnState(settings.data.spawn_state) ? settings.data.spawn_state : "NOT_STARTED";
  return { state, settings: settings.data, sessions: sessions.data };
});

export interface SessionView extends SpawnSnapshot {
  session: SessionRow | null;
  results: ResultRow[];
}

export async function getSessionView(userId: string, kind: SessionKind): Promise<SessionView> {
  const snapshot = await getSpawnSnapshot(userId);
  const session = snapshot.sessions.find((s) => s.kind === kind) ?? null;
  if (!session) return { ...snapshot, session: null, results: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("session_id", session.id)
    .order("started_at", { ascending: true });
  if (error) fail("Loading results", error);
  return { ...snapshot, session, results: data };
}

/** Every Spawn result across sessions, for data-coverage summaries. */
export async function getAllSpawnResults(userId: string): Promise<ResultRow[]> {
  const { sessions } = await getSpawnSnapshot(userId);
  if (sessions.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_results")
    .select("*")
    .in(
      "session_id",
      sessions.map((s) => s.id),
    );
  if (error) fail("Loading results", error);
  return data;
}

export interface AvailableLoad {
  equipmentKey: string;
  name: string;
  loadsKg: number[];
}

export interface TestView extends SessionView {
  /** The newest result for this test (open, resolved or none). */
  result: ResultRow | null;
  /** Earlier results for this test, e.g. a skipped attempt before a retry. */
  history: ResultRow[];
  attempts: AttemptRow[];
  loads: AvailableLoad[];
}

export async function getTestView(userId: string, kind: SessionKind, test: TestDefinition): Promise<TestView> {
  const view = await getSessionView(userId, kind);
  const forTest = view.results.filter((r) => r.test_key === test.key);
  const completed = forTest.find((r) => r.status === "completed");
  const result = completed ?? forTest.at(-1) ?? null;
  const history = forTest.filter((r) => r !== result);

  const supabase = await createClient();
  const [attempts, loads] = await Promise.all([
    result
      ? supabase
          .from("assessment_attempts")
          .select("*")
          .eq("result_id", result.id)
          .order("attempt_number", { ascending: true })
      : Promise.resolve({ data: [] as AttemptRow[], error: null }),
    test.attemptFields.some((f) => f.kind === "load") ? getAvailableLoads(userId) : Promise.resolve([]),
  ]);
  if (attempts.error) fail("Loading attempts", attempts.error);

  return { ...view, result, history, attempts: attempts.data, loads };
}

export async function getAvailableLoads(userId: string): Promise<AvailableLoad[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athlete_equipment")
    .select("loads_kg, equipment:equipment_id (key, name, load_mode, sort_order)")
    .eq("athlete_id", userId);
  if (error) fail("Loading equipment", error);

  return data
    .filter((row) => row.equipment.load_mode === "implement" && row.loads_kg.length > 0)
    .sort((a, b) => a.equipment.sort_order - b.equipment.sort_order)
    .map((row) => ({ equipmentKey: row.equipment.key, name: row.equipment.name, loadsKg: row.loads_kg }));
}

// ---------------------------------------------------------------------------
// Profile context (onboarding + profile screens)
// ---------------------------------------------------------------------------

export interface ProfileContext {
  profile: ProfileRow;
  settings: SettingsRow;
  catalog: EquipmentRow[];
  owned: AthleteEquipmentRow[];
  availability: AvailabilityRow[];
  /** Latest value per body measurement kind. */
  body: Partial<Record<BodyMeasurementRow["kind"], BodyMeasurementRow>>;
}

export async function getProfileContext(userId: string): Promise<ProfileContext> {
  const supabase = await createClient();
  const [profile, settings, catalog, owned, availability, body] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("athlete_settings").select("*").eq("athlete_id", userId).single(),
    supabase.from("equipment").select("*").order("sort_order"),
    supabase.from("athlete_equipment").select("*").eq("athlete_id", userId),
    supabase.from("availability_windows").select("*").eq("athlete_id", userId).order("weekday"),
    supabase
      .from("body_measurements")
      .select("*")
      .eq("athlete_id", userId)
      .order("measured_at", { ascending: false }),
  ]);
  if (profile.error) fail("Loading profile", profile.error);
  if (settings.error) fail("Loading settings", settings.error);
  if (catalog.error) fail("Loading equipment catalog", catalog.error);
  if (owned.error) fail("Loading equipment", owned.error);
  if (availability.error) fail("Loading availability", availability.error);
  if (body.error) fail("Loading body measurements", body.error);

  const latest: ProfileContext["body"] = {};
  for (const row of body.data) latest[row.kind] ??= row;

  return {
    profile: profile.data,
    settings: settings.data,
    catalog: catalog.data,
    owned: owned.data,
    availability: availability.data,
    body: latest,
  };
}

/** Profile context in the plain shape client forms receive. */
export async function getSerializableContext(userId: string) {
  const context = await getProfileContext(userId);
  const body: Record<string, { value: number } | undefined> = {};
  for (const [kind, row] of Object.entries(context.body)) if (row) body[kind] = { value: Number(row.value) };
  return { ...context, body };
}

/** Resume pointers for resolveSpawnPath(). */
export function sessionPointers(sessions: readonly SessionRow[]): SessionPointer[] {
  return sessions.flatMap((s) =>
    isSessionKind(s.kind)
      ? [{ kind: s.kind, status: s.status === "completed" ? "completed" : "in_progress", current_test_key: s.current_test_key }]
      : [],
  );
}

/** Narrow a DB side string. */
export function asSide(value: string): Side {
  return value === "left" || value === "right" ? value : "none";
}
