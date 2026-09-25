/**
 * Input parsing and display formatting for measurements. Values are stored in
 * SI units (or cm for body/short distances, spec §46).
 *
 * Parsers never round or clamp: input that does not fit the rule is rejected
 * with a message, so nothing the athlete typed is silently changed.
 */

export type Unit = "cm" | "kg" | "s" | "m" | "bpm" | "reps" | "percent" | "min" | "s_per_km" | "spm";

export const UNIT_LABELS: Readonly<Record<Unit, string>> = {
  cm: "cm",
  kg: "kg",
  s: "s",
  m: "m",
  bpm: "bpm",
  reps: "reps",
  percent: "%",
  min: "min",
  s_per_km: "/km",
  spm: "spm",
};

export interface NumberRule {
  min: number;
  max: number;
  /** Maximum decimal places accepted. 0 = whole numbers only. */
  decimals: number;
  unit?: Unit | undefined;
}

export type ParseResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

function formatBound(value: number, unit: Unit | undefined): string {
  const label = unit ? UNIT_LABELS[unit] : "";
  if (!label) return String(value);
  return label === "%" || label.startsWith("/") ? `${value}${label}` : `${value} ${label}`;
}

/**
 * Parses a decimal typed on a phone keyboard. Accepts `72.5` and `72,5`
 * (iOS shows a comma in many locales). Empty input is `null` (unknown, not
 * zero); whether it is allowed is the caller's decision.
 */
export function parseDecimal(raw: string, rule: NumberRule): ParseResult {
  const text = raw.trim().replace(/\s+/g, "");
  if (text === "") return { ok: true, value: null };

  if (text.includes(",") && text.includes(".")) {
    return { ok: false, error: "Use one decimal separator, e.g. 72.5." };
  }
  const normalised = text.replace(",", ".");
  if (!NUMBER_PATTERN.test(normalised)) {
    return { ok: false, error: "Enter a number." };
  }

  const fraction = normalised.split(".")[1] ?? "";
  if (fraction.length > rule.decimals) {
    return {
      ok: false,
      error:
        rule.decimals === 0
          ? "Enter a whole number."
          : `Use at most ${rule.decimals} decimal place${rule.decimals === 1 ? "" : "s"}.`,
    };
  }

  const value = Number(normalised);
  if (value < rule.min || value > rule.max) {
    return {
      ok: false,
      error: `Enter a value from ${formatBound(rule.min, rule.unit)} to ${formatBound(rule.max, rule.unit)}.`,
    };
  }
  return { ok: true, value };
}

/**
 * Parses a duration: `75`, `75.4`, `1:15`, `1:15.4` or `12:05`. Minutes may
 * exceed 59; seconds after a colon must be below 60.
 */
export function parseDuration(raw: string, rule: { min: number; max: number }): ParseResult {
  const text = raw.trim().replace(",", ".");
  if (text === "") return { ok: true, value: null };

  const match = /^(?:(\d{1,3}):)?(\d{1,4}(?:\.\d)?)$/.exec(text);
  if (!match) return { ok: false, error: "Enter a time like 1:05 or 65." };

  const minutes = match[1] === undefined ? 0 : Number(match[1]);
  const seconds = Number(match[2]);
  if (match[1] !== undefined && seconds >= 60) {
    return { ok: false, error: "Seconds must be below 60." };
  }

  const total = minutes * 60 + seconds;
  if (total < rule.min || total > rule.max) {
    return {
      ok: false,
      error: `Enter a time from ${formatDuration(rule.min)} to ${formatDuration(rule.max)}.`,
    };
  }
  return { ok: true, value: Math.round(total * 10) / 10 };
}

/** `65.4` → `1:05.4`, `600` → `10:00`. */
export function formatDuration(totalSeconds: number): string {
  const tenths = Math.round(totalSeconds * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = tenths - minutes * 600;
  const seconds = Math.floor(rest / 10);
  const fraction = rest % 10;
  const base = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return fraction ? `${base}.${fraction}` : base;
}

/** Splits seconds into the two duration input boxes (minutes, seconds). */
export function splitDuration(totalSeconds: number): { minutes: string; seconds: string } {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round((totalSeconds - minutes * 60) * 10) / 10;
  return { minutes: String(minutes), seconds: String(seconds) };
}

/** Pace from a distance and time, for display only. */
export function paceSecondsPerKm(distanceM: number, durationS: number): number | null {
  if (!(distanceM > 0) || !(durationS > 0)) return null;
  return durationS / (distanceM / 1000);
}

export function formatPace(secondsPerKm: number): string {
  return `${formatDuration(Math.round(secondsPerKm))} /km`;
}

/** `HH:MM` from a native time input. */
export function isClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Formats a number for display without trailing zeros: 12.50 → "12.5". */
export function formatNumber(value: number, maxDecimals = 1): string {
  return String(Number(value.toFixed(maxDecimals)));
}
