import {
  TEST_CATALOG,
  attemptsReady,
  attributeCoverage,
  attributesForSession,
  fixedSlots,
  isSessionComplete,
  latestResults,
  nextSlot,
  nextTest,
  testProgress,
  testsForSession,
  type ResultSummary,
} from "@ascend/shared";
import { describe, expect, it } from "vitest";

let clock = 0;
function result(test_key: string, status: ResultSummary["status"]): ResultSummary {
  clock += 1;
  return { id: `${test_key}-${clock}`, test_key, status, started_at: new Date(2026, 8, 25, 10, 0, clock).toISOString() };
}

describe("attempt slots", () => {
  it("alternates sides per round for single-leg balance", () => {
    expect(fixedSlots(TEST_CATALOG.M04)).toEqual([
      { side: "left", attemptNumber: 1 },
      { side: "right", attemptNumber: 1 },
      { side: "left", attemptNumber: 2 },
      { side: "right", attemptNumber: 2 },
    ]);
  });

  it("points at the first missing attempt and knows when all are stored", () => {
    const stored = [
      { side: "left" as const, attempt_number: 1 },
      { side: "right" as const, attempt_number: 1 },
    ];
    expect(nextSlot(TEST_CATALOG.M04, stored)).toEqual({ side: "left", attemptNumber: 2 });
    expect(attemptsReady(TEST_CATALOG.M04, stored)).toEqual({ ok: false, reason: "2 attempts still to record." });
    expect(
      attemptsReady(TEST_CATALOG.M04, [...stored, { side: "left", attempt_number: 2 }, { side: "right", attempt_number: 2 }]),
    ).toEqual({ ok: true });
  });

  it("allows variable sets up to the maximum", () => {
    expect(attemptsReady(TEST_CATALOG.F02, [])).toEqual({ ok: false, reason: "Record at least one set." });
    expect(nextSlot(TEST_CATALOG.F02, [{ side: "none", attempt_number: 1 }])).toEqual({ side: "none", attemptNumber: 2 });
    const full = Array.from({ length: 6 }, (_, i) => ({ side: "none" as const, attempt_number: i + 1 }));
    expect(nextSlot(TEST_CATALOG.F02, full)).toBeNull();
  });
});

describe("completion detection", () => {
  it("counts the newest result after a retry (ADR-014)", () => {
    const skipped = result("M03", "skipped");
    const retry = result("M03", "in_progress");
    expect(latestResults([skipped, retry]).get("M03")).toBe(retry);
    expect(testProgress(TEST_CATALOG.M03, [skipped, retry])).toBe("in_progress");
  });

  it("a completed result always wins", () => {
    expect(testProgress(TEST_CATALOG.M01, [result("M01", "completed"), result("M01", "skipped")])).toBe("completed");
  });

  it("a session is complete only when every test is resolved", () => {
    const movement = testsForSession("movement").map((t) => result(t.key, "completed"));
    expect(isSessionComplete("movement", movement)).toBe(true);
    expect(isSessionComplete("movement", movement.slice(1))).toBe(false);
    expect(nextTest("movement", movement.slice(1))?.key).toBe("M01");

    // Skipped, can't-perform and stopped all count as resolved; unknown is not zero.
    const mixed = [...movement.slice(3), result("M01", "skipped"), result("M02", "cannot_perform"), result("M03", "aborted")];
    expect(isSessionComplete("movement", mixed)).toBe(true);
    expect(isSessionComplete("movement", [...mixed, result("M03", "in_progress")])).toBe(false);
  });
});

describe("data coverage (ADR-018)", () => {
  const movementDone = new Set(testsForSession("movement").map((t) => t.key));

  it("after Movement: Mobility and Agility collected, Core partial", () => {
    expect(attributeCoverage("mobility", movementDone).status).toBe("collected");
    expect(attributeCoverage("agility", movementDone).status).toBe("collected");
    expect(attributeCoverage("core", movementDone)).toMatchObject({ status: "partial", covered: 1, total: 3 });
  });

  it("skipped tests leave gaps; Power is never assessed by Spawn", () => {
    const withoutShoulder = new Set([...movementDone].filter((k) => k !== "M03"));
    expect(attributeCoverage("mobility", withoutShoulder).status).toBe("partial");
    const everything = new Set(Object.keys(TEST_CATALOG));
    expect(attributeCoverage("power", everything).status).toBe("not_assessed");
    expect(attributeCoverage("strength", everything).status).toBe("collected");
  });

  it("names the attributes each session informs", () => {
    expect(attributesForSession("movement")).toEqual(["core", "mobility", "agility"]);
    expect(attributesForSession("frame")).toEqual(["strength", "core"]);
    expect(attributesForSession("engine")).toEqual(["endurance", "recovery"]);
  });
});
