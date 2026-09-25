import { cx } from "@/lib/cx";
import styles from "./TimerDisplay.module.css";

function mmss(total: number): string {
  const s = Math.max(0, Math.round(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Active-workout timer (V2 §20): a huge tabular number inside a thin progress
 * ring. Readable at arm's length, outdoors, mid-movement. No scenery.
 */
export function TimerDisplay({
  seconds,
  progress,
  caption,
  label = "Elapsed time",
  tone = "data",
}: {
  seconds: number;
  /** 0–1 around the ring. */
  progress: number;
  caption?: string;
  label?: string;
  tone?: "data" | "gold";
}) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div className={cx(styles.wrap, styles[tone])} role="timer" aria-label={label}>
      <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.track} cx="50" cy="50" r={r} />
        <circle
          className={styles.fill}
          cx="50"
          cy="50"
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - p)}
        />
      </svg>
      <div className={styles.center}>
        <span className={cx("stat-number", styles.time)}>{mmss(seconds)}</span>
        {caption ? <span className={cx("stat-number", styles.caption)}>{caption}</span> : null}
      </div>
    </div>
  );
}
