import { describe, expect, it } from "vitest";
import { displayPercent, displayStat, readEstimate, readLongitudinal } from "@/features/stats/trace";

describe("stats trace readers (Milestone 3.1)", () => {
  it("reads the calibration phase from the trace", () => {
    const trace = {
      longitudinal: { verification_eligible: false, reason: "initial calibration" },
      confidence: { cap_applied: true },
    };
    expect(readLongitudinal(trace)).toEqual({ eligible: false, reason: "initial calibration", capApplied: true });
  });

  it("treats an older trace without longitudinal data as unknown", () => {
    expect(readLongitudinal({ confidence: { value: 0.9 } })).toBeNull();
    expect(readLongitudinal(null)).toBeNull();
  });

  it("reads the missing-evidence estimate and never reports it as a rise", () => {
    expect(readEstimate({ estimate: { observed: 44.5, missing_domain_adjustment: -4.9 } })).toEqual({
      observed: 44.5,
      adjustment: -4.9,
    });
    expect(readEstimate({ estimate: { observed: 50, missing_domain_adjustment: 0.3 } })?.adjustment).toBe(0);
    expect(readEstimate({ estimate: null })).toBeNull();
  });

  it("shows integers and whole percentages only", () => {
    expect(displayStat(44.4999)).toBe("44");
    expect(displayStat(null)).toBe("—");
    expect(displayPercent(0.6849)).toBe("68%");
  });
});
