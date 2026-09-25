"use server";

import {
  BIOLOGICAL_SEX,
  BODY_CIRCUMFERENCES,
  BODY_FAT_RULE,
  CIRCUMFERENCE_RULE,
  DATA_SOURCES,
  ENVIRONMENTS,
  BODY_FAT_TYPICAL,
  HEIGHT_RULE,
  HEIGHT_TYPICAL,
  MAX_NOTE_LENGTH,
  RECENT_INACTIVITY,
  TRAINING_EXPERIENCE,
  WEIGHT_RULE,
  WEIGHT_TYPICAL,
  unusualMessage,
  isOption,
  parseDecimal,
  validateAvailabilityDay,
  validateBirthDate,
  validateLoads,
  validateOptionalClock,
  type AvailabilityInput,
  type AvailabilityValue,
  type NumberRule,
} from "@ascend/shared";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { advanceSpawn, type ActionResult } from "../state";
import { missingContext } from "./context";
import { onboardingPath } from "../routing";
import { isEditableStep, nextStep, type EditableStep } from "./steps";

/**
 * Onboarding / profile step persistence (spec §9, §10, §11 Spawn 0). The
 * same actions back the onboarding flow and the Profile edit screens.
 * Every payload is re-validated here; client validation is only feedback.
 */

export type StepInput =
  | { step: "name"; displayName: string }
  | { step: "birth"; dateOfBirth: string }
  | { step: "sex"; sex: string }
  | { step: "height"; heightCm: string; confirmed?: boolean | undefined }
  | { step: "weight"; weightKg: string; confirmed?: boolean | undefined }
  | { step: "body-fat"; bodyFat: string; confirmed?: boolean | undefined }
  | { step: "measurements"; values: Record<string, string> }
  | { step: "experience"; value: string }
  | { step: "activity"; value: string }
  | { step: "equipment"; keys: string[] }
  | { step: "loads"; loads: Record<string, string[]> }
  | { step: "environments"; values: string[] }
  | { step: "availability"; days: AvailabilityInput[] }
  | { step: "schedule"; wake: string; sleep: string }
  | { step: "sources"; values: string[] }
  | { step: "limitations"; note: string };

export type StepMode = "onboarding" | "edit";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function invalid(fieldErrors: Record<string, string>): ActionResult {
  return { ok: false, error: "Check the highlighted fields.", fieldErrors };
}

function dbError(): ActionResult {
  return { ok: false, error: "That didn't save. Check your connection and try again." };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Body measurements: during onboarding the `spawn` row is edited in place;
 * after onboarding each change appends a new row (ADR-021).
 */
async function writeMeasurement(
  supabase: Supabase,
  userId: string,
  kind: string,
  unit: "kg" | "percent" | "cm",
  value: number | null,
  mode: StepMode,
): Promise<boolean> {
  if (mode === "onboarding") {
    if (value === null) {
      const { error } = await supabase
        .from("body_measurements")
        .delete()
        .eq("athlete_id", userId)
        .eq("kind", kind)
        .eq("context", "spawn");
      return !error;
    }
    const { data: existing } = await supabase
      .from("body_measurements")
      .select("id")
      .eq("athlete_id", userId)
      .eq("kind", kind)
      .eq("context", "spawn")
      .maybeSingle();
    const { error } = existing
      ? await supabase
          .from("body_measurements")
          .update({ value, measured_at: new Date().toISOString() })
          .eq("id", existing.id)
      : await supabase
          .from("body_measurements")
          .insert({ athlete_id: userId, kind, unit, value, context: "spawn" });
    return !error;
  }

  if (value === null) return true;
  const { data: latest } = await supabase
    .from("body_measurements")
    .select("value")
    .eq("athlete_id", userId)
    .eq("kind", kind)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest && Number(latest.value) === value) return true;
  const { error } = await supabase
    .from("body_measurements")
    .insert({ athlete_id: userId, kind, unit, value, context: "general" });
  return !error;
}

function needsConfirmation(
  field: string,
  value: number | null,
  typical: readonly [number, number],
  unit: string,
  confirmed: unknown,
): ActionResult | null {
  const message = unusualMessage(value, typical, unit);
  if (!message || confirmed === true) return null;
  return { ok: false, error: "That value is unusual.", confirm: { [field]: message } };
}

function parseRequired(raw: unknown, rule: NumberRule, field: string, label: string) {
  const parsed = parseDecimal(typeof raw === "string" ? raw : "", rule);
  if (!parsed.ok) return { error: { [field]: parsed.error } };
  if (parsed.value === null) return { error: { [field]: `Enter your ${label}.` } };
  return { value: parsed.value };
}

async function persistStep(supabase: Supabase, userId: string, input: StepInput, mode: StepMode): Promise<ActionResult> {
  switch (input.step) {
    case "name": {
      const name = typeof input.displayName === "string" ? input.displayName.trim() : "";
      if (name.length > 80) return invalid({ displayName: "Keep it under 80 characters." });
      const { error } = await supabase.from("profiles").update({ display_name: name || null }).eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "birth": {
      const result = validateBirthDate(typeof input.dateOfBirth === "string" ? input.dateOfBirth : "", new Date());
      if (!result.ok) return invalid({ dateOfBirth: result.error });
      const { error } = await supabase.from("profiles").update({ date_of_birth: result.value }).eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "sex": {
      if (input.sex !== "" && !isOption(BIOLOGICAL_SEX, input.sex)) return invalid({ sex: "Choose an option." });
      const { error } = await supabase
        .from("profiles")
        .update({ biological_sex: input.sex === "" ? null : input.sex })
        .eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "height": {
      const parsed = parseRequired(input.heightCm, HEIGHT_RULE, "heightCm", "height");
      if (parsed.error) return invalid(parsed.error);
      const check = needsConfirmation("heightCm", parsed.value, HEIGHT_TYPICAL, "cm", input.confirmed);
      if (check) return check;
      const { error } = await supabase.from("profiles").update({ height_cm: parsed.value }).eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "weight": {
      const parsed = parseRequired(input.weightKg, WEIGHT_RULE, "weightKg", "weight");
      if (parsed.error) return invalid(parsed.error);
      const check = needsConfirmation("weightKg", parsed.value, WEIGHT_TYPICAL, "kg", input.confirmed);
      if (check) return check;
      return (await writeMeasurement(supabase, userId, "weight", "kg", parsed.value, mode)) ? { ok: true } : dbError();
    }
    case "body-fat": {
      const parsed = parseDecimal(typeof input.bodyFat === "string" ? input.bodyFat : "", BODY_FAT_RULE);
      if (!parsed.ok) return invalid({ bodyFat: parsed.error });
      const check = needsConfirmation("bodyFat", parsed.value, BODY_FAT_TYPICAL, "%", input.confirmed);
      if (check) return check;
      return (await writeMeasurement(supabase, userId, "body_fat", "percent", parsed.value, mode))
        ? { ok: true }
        : dbError();
    }
    case "measurements": {
      const errors: Record<string, string> = {};
      const values: Array<[string, number | null]> = [];
      for (const { value: kind } of BODY_CIRCUMFERENCES) {
        const raw = input.values?.[kind];
        const parsed = parseDecimal(typeof raw === "string" ? raw : "", CIRCUMFERENCE_RULE);
        if (!parsed.ok) errors[kind] = parsed.error;
        else values.push([kind, parsed.value]);
      }
      if (Object.keys(errors).length > 0) return invalid(errors);
      for (const [kind, value] of values) {
        if (!(await writeMeasurement(supabase, userId, kind, "cm", value, mode))) return dbError();
      }
      return { ok: true };
    }
    case "experience": {
      if (!isOption(TRAINING_EXPERIENCE, input.value)) return invalid({ value: "Choose one." });
      const { error } = await supabase.from("profiles").update({ training_experience: input.value }).eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "activity": {
      if (!isOption(RECENT_INACTIVITY, input.value)) return invalid({ value: "Choose one." });
      const { error } = await supabase.from("profiles").update({ recent_inactivity: input.value }).eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "equipment": {
      if (!isStringArray(input.keys)) return invalid({ keys: "Choose your equipment." });
      const { data: catalog, error: catalogError } = await supabase.from("equipment").select("id, key");
      if (catalogError) return dbError();
      const wanted = catalog.filter((item) => input.keys.includes(item.key));
      if (wanted.length !== new Set(input.keys).size) return invalid({ keys: "Unknown equipment." });

      const { data: owned, error: ownedError } = await supabase
        .from("athlete_equipment")
        .select("id, equipment_id")
        .eq("athlete_id", userId);
      if (ownedError) return dbError();

      const wantedIds = new Set(wanted.map((item) => item.id));
      const removeIds = owned.filter((row) => !wantedIds.has(row.equipment_id)).map((row) => row.id);
      const ownedIds = new Set(owned.map((row) => row.equipment_id));
      const add = wanted.filter((item) => !ownedIds.has(item.id));

      if (removeIds.length > 0) {
        const { error } = await supabase.from("athlete_equipment").delete().in("id", removeIds);
        if (error) return dbError();
      }
      if (add.length > 0) {
        const { error } = await supabase
          .from("athlete_equipment")
          .insert(add.map((item) => ({ athlete_id: userId, equipment_id: item.id })));
        if (error) return dbError();
      }
      return { ok: true };
    }
    case "loads": {
      const { data: owned, error: ownedError } = await supabase
        .from("athlete_equipment")
        .select("id, equipment:equipment_id (key, load_mode)")
        .eq("athlete_id", userId);
      if (ownedError) return dbError();

      const errors: Record<string, string> = {};
      const updates: Array<{ id: string; loads: number[] }> = [];
      for (const row of owned) {
        if (row.equipment.load_mode === "none") continue;
        const raw = input.loads?.[row.equipment.key] ?? [];
        if (!isStringArray(raw)) {
          errors[row.equipment.key] = "Enter weights in kg.";
          continue;
        }
        const result = validateLoads(raw);
        if (!result.ok) errors[row.equipment.key] = result.error;
        else updates.push({ id: row.id, loads: result.value });
      }
      if (Object.keys(errors).length > 0) return invalid(errors);
      for (const update of updates) {
        const { error } = await supabase.from("athlete_equipment").update({ loads_kg: update.loads }).eq("id", update.id);
        if (error) return dbError();
      }
      return { ok: true };
    }
    case "environments": {
      if (!isStringArray(input.values) || !input.values.every((v) => isOption(ENVIRONMENTS, v))) {
        return invalid({ values: "Choose from the list." });
      }
      if (input.values.length === 0) return invalid({ values: "Choose at least one place you can train." });
      const { error } = await supabase
        .from("athlete_settings")
        .update({ environments: [...new Set(input.values)] })
        .eq("athlete_id", userId);
      return error ? dbError() : { ok: true };
    }
    case "availability": {
      if (!Array.isArray(input.days) || input.days.length !== 7) return invalid({ days: "Set all seven days." });
      const errors: Record<string, string> = {};
      const rows: AvailabilityValue[] = [];
      for (const day of input.days) {
        const result = validateAvailabilityDay(day);
        if (!result.ok) errors[String(day.weekday)] = result.error;
        else rows.push(result.value);
      }
      if (new Set(rows.map((r) => r.weekday)).size !== rows.length) return invalid({ days: "Each day once." });
      if (Object.keys(errors).length > 0) return invalid(errors);
      if (!rows.some((row) => row.available)) {
        return invalid({ days: "Choose at least one day you can train." });
      }
      // Explicit update/insert: identity columns are not updatable (tight grants).
      const { data: existing, error: loadError } = await supabase
        .from("availability_windows")
        .select("id, weekday")
        .eq("athlete_id", userId);
      if (loadError) return dbError();
      for (const row of rows) {
        const current = existing.find((e) => e.weekday === row.weekday);
        const { weekday, ...values } = row;
        const { error } = current
          ? await supabase.from("availability_windows").update(values).eq("id", current.id)
          : await supabase.from("availability_windows").insert({ ...values, weekday, athlete_id: userId });
        if (error) return dbError();
      }
      return { ok: true };
    }
    case "schedule": {
      const wake = validateOptionalClock(typeof input.wake === "string" ? input.wake : "");
      const sleep = validateOptionalClock(typeof input.sleep === "string" ? input.sleep : "");
      const errors: Record<string, string> = {};
      if (!wake.ok) errors.wake = wake.error;
      if (!sleep.ok) errors.sleep = sleep.error;
      if (!wake.ok || !sleep.ok) return invalid(errors);
      const { error } = await supabase
        .from("profiles")
        .update({ wake_time: wake.value, sleep_time: sleep.value })
        .eq("id", userId);
      return error ? dbError() : { ok: true };
    }
    case "sources": {
      if (!isStringArray(input.values) || !input.values.every((v) => isOption(DATA_SOURCES, v))) {
        return invalid({ values: "Choose from the list." });
      }
      if (input.values.includes("none") && input.values.length > 1) {
        return invalid({ values: "“None” can't be combined with a device." });
      }
      const { error } = await supabase
        .from("athlete_settings")
        .update({ data_sources: [...new Set(input.values)] })
        .eq("athlete_id", userId);
      return error ? dbError() : { ok: true };
    }
    case "limitations": {
      const note = typeof input.note === "string" ? input.note.trim() : "";
      if (note.length > MAX_NOTE_LENGTH) return invalid({ note: `Keep it under ${MAX_NOTE_LENGTH} characters.` });
      const { error } = await supabase
        .from("profiles")
        .update({ limitations_note: note || null })
        .eq("id", userId);
      return error ? dbError() : { ok: true };
    }
  }
}

async function hasLoadableEquipment(supabase: Supabase, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("athlete_equipment")
    .select("equipment:equipment_id (load_mode)")
    .eq("athlete_id", userId);
  return (data ?? []).some((row) => row.equipment.load_mode !== "none");
}

/**
 * Saves one step. In onboarding mode it also records the next step so the
 * athlete resumes exactly there (spec §26: persist partially completed forms).
 */
export async function saveProfileStep(input: StepInput, mode: StepMode): Promise<ActionResult> {
  if (!input || !isEditableStep(input.step)) return { ok: false, error: "Unknown step." };
  const user = await requireUser();
  const supabase = await createClient();

  if (mode === "onboarding") {
    const started = await advanceSpawn(supabase, user.id, "START_PROFILE", { allowAlreadyPast: true });
    if (!started.ok) return started;
  }

  const saved = await persistStep(supabase, user.id, input, mode);
  if (!saved.ok) return saved;

  if (mode === "edit") {
    revalidatePath("/profile");
    return { ok: true, redirectTo: "/profile" };
  }

  const step: EditableStep = input.step;
  const next = nextStep(step, await hasLoadableEquipment(supabase, user.id));
  await supabase.from("athlete_settings").update({ onboarding_step: next }).eq("athlete_id", user.id);
  return { ok: true, redirectTo: onboardingPath(next) };
}

export async function startProfile(): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const result = await advanceSpawn(supabase, user.id, "START_PROFILE", {
    allowAlreadyPast: true,
    patch: { spawn_started_at: new Date().toISOString(), onboarding_step: "name" },
  });
  return result.ok ? { ok: true, redirectTo: onboardingPath("name") } : result;
}

/** Spawn 0 complete → Spawn Point (spec §11). */
export async function completeContext(): Promise<ActionResult> {
  const user = await requireUser();
  const missing = await missingContext(user.id);
  if (missing.length > 0) {
    return { ok: false, error: "A few required answers are missing.", redirectTo: onboardingPath(missing[0] ?? "name") };
  }
  const supabase = await createClient();
  const result = await advanceSpawn(supabase, user.id, "COMPLETE_CONTEXT", {
    allowAlreadyPast: true,
    patch: { context_completed_at: new Date().toISOString(), onboarding_step: null },
  });
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/spawn" };
}
