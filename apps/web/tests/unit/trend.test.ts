import { pointsInWindow, statTrend, trendObservations, type HistoryPoint } from "@ascend/shared";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-10-30T12:00:00Z");
const day = (d: number, hour = 12) => new Date(Date.UTC(2026, 9, d, hour)).toISOString();
const point = (at: string, current: number | null, engineVersion = "0.1.1"): HistoryPoint => ({
  at,
  current,
  peak: null,
  confidence: 0.68,
  engineVersion,
});

describe("trend-0.1 (ADR-042)", () => {
  it("a single Spawn snapshot is never a trend", () => {
    expect(statTrend([point(day(29), 44)], "28d", NOW).state).toBe("insufficient_history");
  });

  it("needs three independent observations", () => {
    expect(statTrend([point(day(10), 40), point(day(20), 45)], "28d", NOW).state).toBe("insufficient_history");
  });

  it("collapses snapshots less than 24 h apart", () => {
    const same = [point(day(28, 8), 40), point(day(28, 12), 42), point(day(28, 20), 43)];
    expect(trendObservations(same)).toHaveLength(1);
    expect(statTrend(same, "7d", NOW).state).toBe("insufficient_history");
  });

  it("needs a span of at least max(3 days, a quarter of the window)", () => {
    const close = [point(day(24), 40), point(day(25), 42), point(day(27), 45)];
    expect(statTrend(close, "7d", NOW).state).toBe("improving"); // 3 days ≥ max(3, 1.75)
    expect(statTrend(close, "28d", NOW).state).toBe("insufficient_history"); // 3 days < 7
    expect(statTrend([point(day(24), 40), point(day(25), 42), point(day(26), 45)], "7d", NOW).state).toBe(
      "insufficient_history",
    ); // 2 days < 3
  });

  it("classifies by last − first with a ±2 threshold", () => {
    const base = [point(day(5), 40), point(day(15), 41)];
    expect(statTrend([...base, point(day(25), 42.5)], "28d", NOW)).toMatchObject({ state: "improving", delta: 2.5 });
    expect(statTrend([...base, point(day(25), 41.9)], "28d", NOW).state).toBe("stable");
    expect(statTrend([...base, point(day(25), 37)], "28d", NOW)).toMatchObject({ state: "declining", delta: -3 });
  });

  it("ignores snapshots from an earlier engine version (recalibration is not athletic change)", () => {
    const points = [point(day(5), 30, "0.1.0"), point(day(10), 40), point(day(15), 40.5), point(day(25), 41)];
    expect(statTrend(points, "28d", NOW)).toMatchObject({ state: "stable", observations: 3 });
  });

  it("ignores Unranked points and points outside the window", () => {
    const points = [point(day(10), null), point("2026-08-01T00:00:00Z", 10), point(day(29), 44)];
    expect(pointsInWindow(points, "28d", NOW)).toHaveLength(2);
    expect(trendObservations(pointsInWindow(points, "1y", NOW))).toHaveLength(2); // the Unranked point never counts
    expect(statTrend(points, "1y", NOW).state).toBe("insufficient_history");
  });
});
