/**
 * Stat history windows and the conservative trend rule `trend-0.1` (ADR-042).
 *
 * History comes only from stored snapshots. Nothing here interpolates,
 * smooths or invents points; a single snapshot is never a trend.
 */

export const TREND_RULES_VERSION = "trend-0.1";

export const HISTORY_WINDOWS = { "7d": 7, "28d": 28, "3m": 91, "1y": 365 } as const;
export type HistoryWindow = keyof typeof HISTORY_WINDOWS;
export const HISTORY_WINDOW_LABELS: Record<HistoryWindow, string> = { "7d": "7D", "28d": "28D", "3m": "3M", "1y": "1Y" };

export function isHistoryWindow(value: unknown): value is HistoryWindow {
  return typeof value === "string" && value in HISTORY_WINDOWS;
}

export interface HistoryPoint {
  /** ISO timestamp of the calculation. */
  at: string;
  /** Internal decimal Current; null = Unranked at that time. */
  current: number | null;
  /** Verified Peak at that time (never decreases). */
  peak: number | null;
  confidence: number;
  engineVersion: string;
}

export type TrendState = "improving" | "stable" | "declining" | "insufficient_history";

export interface Trend {
  state: TrendState;
  /** last − first observation, when a trend exists. */
  delta: number | null;
  observations: number;
  rulesVersion: typeof TREND_RULES_VERSION;
}

const DAY_MS = 86_400_000;
const INDEPENDENT_MS = DAY_MS;
export const TREND_MIN_OBSERVATIONS = 3;
export const TREND_THRESHOLD = 2;

/** Snapshots inside [now − window, now], oldest first. */
export function pointsInWindow(points: readonly HistoryPoint[], window: HistoryWindow, now: Date): HistoryPoint[] {
  const from = now.getTime() - HISTORY_WINDOWS[window] * DAY_MS;
  return points
    .filter((p) => {
      const t = Date.parse(p.at);
      return t >= from && t <= now.getTime();
    })
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/**
 * Independent observations: ranked points from the latest engine version,
 * with points closer than 24 h collapsed into the later one.
 */
export function trendObservations(points: readonly HistoryPoint[]): Array<{ at: number; current: number }> {
  const ranked = [...points].filter((p) => p.current !== null).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latestVersion = ranked.at(-1)?.engineVersion;
  const observations: Array<{ at: number; current: number; start: number }> = [];
  for (const point of ranked) {
    if (point.engineVersion !== latestVersion) continue;
    const at = Date.parse(point.at);
    const last = observations.at(-1);
    if (last && at - last.start < INDEPENDENT_MS) {
      last.at = at;
      last.current = point.current!;
    } else {
      observations.push({ at, current: point.current!, start: at });
    }
  }
  return observations.map(({ at, current }) => ({ at, current }));
}

/** `trend-0.1`: ≥ 3 independent observations spanning ≥ max(3 days, window/4); Δ ±2.0. */
export function statTrend(points: readonly HistoryPoint[], window: HistoryWindow, now: Date): Trend {
  const observations = trendObservations(pointsInWindow(points, window, now));
  const insufficient: Trend = { state: "insufficient_history", delta: null, observations: observations.length, rulesVersion: TREND_RULES_VERSION };
  if (observations.length < TREND_MIN_OBSERVATIONS) return insufficient;
  const span = observations.at(-1)!.at - observations[0]!.at;
  if (span < Math.max(3, HISTORY_WINDOWS[window] / 4) * DAY_MS) return insufficient;
  const delta = observations.at(-1)!.current - observations[0]!.current;
  const state: TrendState = delta >= TREND_THRESHOLD ? "improving" : delta <= -TREND_THRESHOLD ? "declining" : "stable";
  return { state, delta, observations: observations.length, rulesVersion: TREND_RULES_VERSION };
}
