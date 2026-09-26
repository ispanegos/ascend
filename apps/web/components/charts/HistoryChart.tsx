import { HISTORY_WINDOWS, type HistoryPoint, type HistoryWindow } from "@ascend/shared";
import { useId } from "react";
import { cx } from "@/lib/cx";
import styles from "./HistoryChart.module.css";

const W = 320;
const H = 150;
const PAD = { top: 12, right: 12, bottom: 24, left: 30 };
const DAY_MS = 86_400_000;

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * History chart (ADR-042, V2 §18): stored snapshots only — no interpolation,
 * smoothing or synthetic points. Current is a cyan line with a dot per
 * snapshot; the verified Peak is a gold dashed step. A table carries the same
 * data for screen readers and anyone who prefers numbers. Calm: no animation.
 */
export function HistoryChart({
  label,
  points,
  window,
  now,
}: {
  label: string;
  /** Snapshots already limited to the window, oldest first. */
  points: readonly HistoryPoint[];
  window: HistoryWindow;
  now: Date;
}) {
  const id = useId();
  const ranked = points.filter((p) => p.current !== null);
  const end = now.getTime();
  const start = end - HISTORY_WINDOWS[window] * DAY_MS;
  const values = ranked.flatMap((p) => [p.current!, ...(p.peak === null ? [] : [p.peak])]);
  // Honest vertical range: around the data, at least 20 points tall, inside 0–100.
  const lo = values.length ? Math.max(0, Math.floor((Math.min(...values) - 5) / 5) * 5) : 0;
  const hi = values.length ? Math.min(100, Math.max(lo + 20, Math.ceil((Math.max(...values) + 5) / 5) * 5)) : 100;
  const x = (ms: number) => PAD.left + ((ms - start) / (end - start)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const current = ranked.map((p) => [x(Date.parse(p.at)), y(p.current!)] as const);
  const peaks = ranked.filter((p) => p.peak !== null);
  const peakPath = peaks
    .map((p, i) => {
      const px = x(Date.parse(p.at));
      const py = y(p.peak!);
      const next = peaks[i + 1];
      return `${i ? "L" : "M"}${px} ${py} H${next ? x(Date.parse(next.at)) : W - PAD.right}`;
    })
    .join(" ");
  const summary = ranked.length
    ? `${label}: ${ranked.length} ${ranked.length === 1 ? "snapshot" : "snapshots"} in this period, from ${Math.round(ranked[0]!.current!)} to ${Math.round(ranked.at(-1)!.current!)}.`
    : `${label}: no measurements in this period.`;

  return (
    <figure className={styles.figure}>
      <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-desc`}>
        <desc id={`${id}-desc`}>{summary}</desc>
        {[lo, (lo + hi) / 2, hi].map((tick) => (
          <g key={tick}>
            <line className={styles.grid} x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className={styles.tick} x={PAD.left - 6} y={y(tick) + 3} textAnchor="end">
              {Math.round(tick)}
            </text>
          </g>
        ))}
        <text className={styles.tick} x={PAD.left} y={H - 6}>
          {formatDay(start)}
        </text>
        <text className={styles.tick} x={W - PAD.right} y={H - 6} textAnchor="end">
          {formatDay(end)}
        </text>
        {peakPath ? <path className={styles.peak} d={peakPath} /> : null}
        {current.length > 1 ? (
          <polyline className={styles.current} points={current.map(([px, py]) => `${px},${py}`).join(" ")} />
        ) : null}
        {current.map(([px, py], i) => (
          <circle key={i} className={cx(styles.dot, i === current.length - 1 && styles.last)} cx={px} cy={py} r={i === current.length - 1 ? 4 : 3} />
        ))}
      </svg>
      <figcaption className={styles.legend}>
        <span className={styles.keyCurrent}>Current</span>
        {peaks.length ? <span className={styles.keyPeak}>Verified Peak</span> : null}
      </figcaption>
      {ranked.length ? (
        <details className={styles.data}>
          <summary>Show the numbers</summary>
          <table>
            <caption className="visually-hidden">{label} snapshots</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Current</th>
                <th scope="col">Peak</th>
                <th scope="col">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p) => (
                <tr key={p.at}>
                  <td>{formatDay(Date.parse(p.at))}</td>
                  <td className="stat-number">{Math.round(p.current!)}</td>
                  <td className="stat-number">{p.peak === null ? "—" : Math.round(p.peak)}</td>
                  <td className="stat-number">{Math.round(p.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </figure>
  );
}
