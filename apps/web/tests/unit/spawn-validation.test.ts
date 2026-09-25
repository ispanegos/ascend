import {
  ageOn,
  formatDuration,
  parseDecimal,
  parseDuration,
  validateAvailabilityDay,
  validateBirthDate,
  validateLoads,
} from "@ascend/shared";
import { describe, expect, it } from "vitest";
import { devToolsEnabled } from "@/lib/dev";

const WEIGHT = { min: 30, max: 350, decimals: 1, unit: "kg" as const };

describe("parseDecimal", () => {
  it("accepts a decimal point and a decimal comma", () => {
    expect(parseDecimal("96.4", WEIGHT)).toEqual({ ok: true, value: 96.4 });
    expect(parseDecimal("96,4", WEIGHT)).toEqual({ ok: true, value: 96.4 });
    expect(parseDecimal(" 96 ", WEIGHT)).toEqual({ ok: true, value: 96 });
  });

  it("treats empty as unknown, never zero", () => {
    expect(parseDecimal("", WEIGHT)).toEqual({ ok: true, value: null });
  });

  it("rejects out-of-range values instead of clamping", () => {
    const result = parseDecimal("18", WEIGHT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Enter a value from 30 kg to 350 kg.");
  });

  it("rejects extra decimals instead of rounding", () => {
    expect(parseDecimal("96.45", WEIGHT)).toMatchObject({ ok: false, error: "Use at most 1 decimal place." });
    expect(parseDecimal("12.5", { min: 0, max: 100, decimals: 0 })).toMatchObject({ error: "Enter a whole number." });
  });

  it.each(["1.234,5", "abc", "1e3", "--2", "12kg"])("rejects %s", (raw) => {
    expect(parseDecimal(raw, WEIGHT).ok).toBe(false);
  });

  it("rejects impossible negatives but allows signed measurements", () => {
    expect(parseDecimal("-5", { min: 0, max: 30, decimals: 1 }).ok).toBe(false);
    expect(parseDecimal("-4.5", { min: -50, max: 50, decimals: 1 })).toEqual({ ok: true, value: -4.5 });
  });
});

describe("durations", () => {
  it("parses m:ss, seconds and tenths", () => {
    expect(parseDuration("1:05", { min: 0, max: 600 })).toEqual({ ok: true, value: 65 });
    expect(parseDuration("52,5", { min: 0, max: 60 })).toEqual({ ok: true, value: 52.5 });
    expect(parseDuration("20:00", { min: 0, max: 1800 })).toEqual({ ok: true, value: 1200 });
  });

  it("rejects seconds ≥ 60 after a colon and values past the cap", () => {
    expect(parseDuration("1:75", { min: 0, max: 600 }).ok).toBe(false);
    expect(parseDuration("75", { min: 0, max: 60 })).toMatchObject({ ok: false, error: "Enter a time from 0:00 to 1:00." });
  });

  it("formats without losing tenths", () => {
    expect(formatDuration(65.4)).toBe("1:05.4");
    expect(formatDuration(360)).toBe("6:00");
  });
});

describe("profile validation", () => {
  const today = new Date("2026-09-25T12:00:00Z");

  it("computes age around birthdays", () => {
    expect(ageOn("1990-09-25", today)).toBe(36);
    expect(ageOn("1990-09-26", today)).toBe(35);
  });

  it("validates birth dates", () => {
    expect(validateBirthDate("1988-02-29", today)).toEqual({ ok: true, value: "1988-02-29" });
    expect(validateBirthDate("2001-02-30", today).ok).toBe(false);
    expect(validateBirthDate("2020-01-01", today).ok).toBe(false);
    expect(validateBirthDate("", today).ok).toBe(false);
  });

  it("validates availability days", () => {
    expect(validateAvailabilityDay({ weekday: 1, available: true, start: "06:30", end: "08:00", maxDurationMin: "60" })).toEqual({
      ok: true,
      value: { weekday: 1, available: true, start_time: "06:30", end_time: "08:00", max_duration_min: 60 },
    });
    expect(validateAvailabilityDay({ weekday: 2, available: true, start: "", end: "", maxDurationMin: "" }).ok).toBe(false);
    expect(validateAvailabilityDay({ weekday: 2, available: true, start: "09:00", end: "08:00", maxDurationMin: "45" }).ok).toBe(false);
    expect(validateAvailabilityDay({ weekday: 2, available: true, start: "09:00", end: "", maxDurationMin: "45" }).ok).toBe(false);
    expect(validateAvailabilityDay({ weekday: 3, available: false, start: "", end: "", maxDurationMin: "" })).toMatchObject({
      ok: true,
      value: { available: false, max_duration_min: null },
    });
  });

  it("validates equipment loads without merging duplicates silently", () => {
    expect(validateLoads(["16", "12", "20"])).toEqual({ ok: true, value: [12, 16, 20] });
    expect(validateLoads(["16", "16"]).ok).toBe(false);
    expect(validateLoads(["0"]).ok).toBe(false);
  });
});

describe("development tools (ADR-019)", () => {
  it("are disabled outside next dev", () => {
    expect(process.env.NODE_ENV).not.toBe("development");
    expect(devToolsEnabled()).toBe(false);
  });
});
