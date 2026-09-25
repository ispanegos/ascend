import { isClockTime, parseDecimal } from "../units";
import { LOAD_RULE, MAX_AGE_YEARS, MIN_AGE_YEARS, SESSION_LENGTHS_MIN } from "./options";

/** Profile input validation (spec §9). Pure; used by client and server. */

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** Whole years between an ISO date (YYYY-MM-DD) and `today`. */
export function ageOn(dateOfBirth: string, today: Date): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number) as [number, number, number];
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function validateBirthDate(raw: string, today: Date): Validated<string> {
  const text = raw.trim();
  if (text === "") return { ok: false, error: "Enter your date of birth." };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return { ok: false, error: "Enter a valid date." };
  const date = new Date(`${text}T00:00:00Z`);
  // Rejects dates such as 2001-02-30 that Date would roll over.
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    return { ok: false, error: "Enter a valid date." };
  }
  const age = ageOn(text, today);
  if (age < MIN_AGE_YEARS) return { ok: false, error: `ASCEND is for athletes aged ${MIN_AGE_YEARS} and over.` };
  if (age > MAX_AGE_YEARS) return { ok: false, error: "Check the year." };
  return { ok: true, value: text };
}

export interface AvailabilityInput {
  weekday: number;
  available: boolean;
  start: string;
  end: string;
  maxDurationMin: string;
}

export interface AvailabilityValue {
  weekday: number;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  max_duration_min: number | null;
}

export function validateAvailabilityDay(input: AvailabilityInput): Validated<AvailabilityValue> {
  if (!Number.isInteger(input.weekday) || input.weekday < 1 || input.weekday > 7) {
    return { ok: false, error: "Unknown day." };
  }
  if (!input.available) {
    return {
      ok: true,
      value: { weekday: input.weekday, available: false, start_time: null, end_time: null, max_duration_min: null },
    };
  }

  const duration = Number(input.maxDurationMin);
  if (!(SESSION_LENGTHS_MIN as readonly number[]).includes(duration)) {
    return { ok: false, error: "Choose how long you can train." };
  }

  const hasStart = input.start !== "";
  const hasEnd = input.end !== "";
  if (hasStart !== hasEnd) return { ok: false, error: "Set both a start and an end time, or neither." };
  if (hasStart && (!isClockTime(input.start) || !isClockTime(input.end))) {
    return { ok: false, error: "Enter times as HH:MM." };
  }
  if (hasStart && input.end <= input.start) return { ok: false, error: "The window must end after it starts." };

  return {
    ok: true,
    value: {
      weekday: input.weekday,
      available: true,
      start_time: hasStart ? input.start : null,
      end_time: hasEnd ? input.end : null,
      max_duration_min: duration,
    },
  };
}

/** Validates implement weights. Duplicates are an error, not silently merged. */
export function validateLoads(raw: readonly string[]): Validated<number[]> {
  const values: number[] = [];
  for (const entry of raw) {
    const parsed = parseDecimal(entry, LOAD_RULE);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (parsed.value === null) continue;
    if (values.includes(parsed.value)) return { ok: false, error: `${parsed.value} kg is listed twice.` };
    values.push(parsed.value);
  }
  if (values.length > 40) return { ok: false, error: "List at most 40 weights." };
  return { ok: true, value: values.sort((a, b) => a - b) };
}

export function validateOptionalClock(raw: string): Validated<string | null> {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  return isClockTime(text) ? { ok: true, value: text } : { ok: false, error: "Enter a time as HH:MM." };
}
