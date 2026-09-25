import {
  TEST_CATALOG,
  buildAttemptRecord,
  buildResultPatch,
  LIMITING_FACTORS,
  TECHNIQUE_VALUES,
  TEST_KEYS,
  crossFieldErrors,
  namesPainAsLimit,
  statusForReason,
  unusualValues,
  validateFields,
  visibleFields,
} from "@ascend/shared";
import { describe, expect, it } from "vitest";

describe("attempt storage mapping (ADR-013)", () => {
  it("stores categorical Movement values in data, not columns", () => {
    const result = buildAttemptRecord(TEST_CATALOG.M01, { depth: "parallel", heels: "lift", control: "stable" }, {}, "none");
    expect(result).toEqual({
      ok: true,
      record: { side: "none", columns: {}, data: { depth: "parallel", heels: "lift", control: "stable" } },
    });
  });

  it("stores measurements in typed SI columns", () => {
    const result = buildAttemptRecord(TEST_CATALOG.M02, { measure_cm: "7,5" }, {}, "right");
    expect(result).toMatchObject({ ok: true, record: { side: "right", columns: { measure_cm: 7.5 } } });
  });

  it("stores the total load and what was held", () => {
    const result = buildAttemptRecord(
      TEST_CATALOG.F03,
      { load_kg: "2x16", reps: "10", rpe: "6", technique: "clean" },
      {},
      "none",
    );
    expect(result).toMatchObject({
      ok: true,
      record: {
        columns: { load_kg: 32, reps: 10, rpe: 6, technique: "clean" },
        data: { implement_count: 2, implement_kg: 16 },
      },
    });
  });

  it("stores E03 raw readings and the absolute drops (§14)", () => {
    const result = buildAttemptRecord(
      TEST_CATALOG.E03,
      { hr_stop_bpm: "131", hr_1min_bpm: "112", hr_2min_bpm: "98" },
      {},
      "none",
    );
    expect(result).toMatchObject({
      ok: true,
      record: { data: { hr_stop_bpm: 131, hr_1min_bpm: 112, hr_2min_bpm: 98, drop_1min_bpm: 19, drop_2min_bpm: 33 } },
    });
  });

  it("requires required fields and leaves optional ones unknown", () => {
    const missing = buildAttemptRecord(TEST_CATALOG.E02, {}, {}, "none");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(Object.keys(missing.errors)).toEqual(["distance_m", "duration_s"]);

    const minimal = buildAttemptRecord(TEST_CATALOG.E02, { distance_m: "612", duration_s: "360" }, {}, "none");
    expect(minimal).toMatchObject({ ok: true, record: { columns: { distance_m: 612, duration_s: 360, avg_hr_bpm: null } } });
  });

  it("rejects implausible heart rates without claiming medical validation", () => {
    const result = buildAttemptRecord(TEST_CATALOG.E01, { avg_hr_bpm: "400" }, {}, "none");
    expect(result.ok).toBe(false);
  });

  it("rejects a max HR below the average and run+walk beyond total time", () => {
    expect(crossFieldErrors({ avg_hr_bpm: 150, max_hr_bpm: 140 })).toHaveProperty("max_hr_bpm");
    expect(crossFieldErrors({ duration_s: 1200, run_time_s: 800, walk_time_s: 500 })).toHaveProperty("walk_time_s");
    expect(crossFieldErrors({ duration_s: 1200, run_time_s: 700, walk_time_s: 500 })).toEqual({});
  });
});

describe("conditional fields", () => {
  it("F01 asks for the hand height only for incline push-ups", () => {
    expect(visibleFields(TEST_CATALOG.F01.resultFields, { variant: "standard" }).map((f) => f.key)).toEqual(["variant"]);
    expect(buildResultPatch(TEST_CATALOG.F01, { variant: "incline" }).ok).toBe(false);
    expect(buildResultPatch(TEST_CATALOG.F01, { variant: "incline", incline_height_cm: "45" })).toEqual({
      ok: true,
      record: { variant: "incline", data: { incline_height_cm: 45 } },
    });
  });

  it("F04 records the arm for one-arm rows and no load for pull-ups", () => {
    const oneArm = buildAttemptRecord(
      TEST_CATALOG.F04,
      { side: "left", load_kg: "1x16", reps: "8", rpe: "7", technique: "clean" },
      { variant: "bent_over_row", setup: "unilateral" },
      "none",
    );
    expect(oneArm).toMatchObject({ ok: true, record: { side: "left", columns: { load_kg: 16 } } });

    const pullUp = buildAttemptRecord(TEST_CATALOG.F04, { reps: "3", rpe: "9", technique: "clean" }, { variant: "pull_up" }, "none");
    expect(pullUp).toMatchObject({ ok: true, record: { side: "none", columns: { reps: 3 } } });
  });
});

describe("pain and skip semantics (spec §53, §72.4)", () => {
  it("detects pain named as a limit or stop reason", () => {
    expect(namesPainAsLimit([{ limiting_factor: "pain" }])).toBe(true);
    expect(namesPainAsLimit([{ stop_reason: "pain" }])).toBe(true);
    expect(namesPainAsLimit([{ limiting_factor: "breath" }])).toBe(false);
  });

  it("maps approved reasons to statuses (ADR-023)", () => {
    expect(statusForReason("missing_equipment", false)).toBe("skipped");
    expect(statusForReason("environment_unavailable", false)).toBe("skipped");
    expect(statusForReason("other", false)).toBe("skipped");
    expect(statusForReason("pain", false)).toBe("cannot_perform");
    expect(statusForReason("cannot_perform_safely", false)).toBe("cannot_perform");
    expect(statusForReason("does_not_know_technique", false)).toBe("cannot_perform");
    expect(statusForReason("other", true)).toBe("aborted");
  });
});

describe("approved vocabularies (ADR-023)", () => {
  it("every limiting-factor option comes from the shared vocabulary", () => {
    for (const key of TEST_KEYS) {
      for (const field of [...TEST_CATALOG[key].attemptFields, ...TEST_CATALOG[key].resultFields]) {
        if (field.kind === "choice" && (field.key === "limiting_factor" || field.key === "stop_reason")) {
          for (const option of field.options) {
            expect(LIMITING_FACTORS as readonly string[], `${key}.${field.key}`).toContain(option.value);
          }
        }
        if (field.kind === "choice" && field.key === "technique") {
          expect(field.options.map((o) => o.value)).toEqual([...TECHNIQUE_VALUES]);
        }
      }
    }
  });
});

describe("unusual values need confirmation, never clamping (ADR-023 §7)", () => {
  it("flags a valid but unusual heart rate", () => {
    const { values } = validateFields(TEST_CATALOG.E02.attemptFields, {
      distance_m: "612",
      duration_s: "360",
      avg_hr_bpm: "228",
    });
    expect(values.avg_hr_bpm).toBe(228);
    expect(Object.keys(unusualValues(TEST_CATALOG.E02.attemptFields, values))).toEqual(["avg_hr_bpm"]);
  });

  it("accepts typical values silently", () => {
    const { values } = validateFields(TEST_CATALOG.E02.attemptFields, { distance_m: "612", duration_s: "360", avg_hr_bpm: "118" });
    expect(unusualValues(TEST_CATALOG.E02.attemptFields, values)).toEqual({});
  });
});
