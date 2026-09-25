import { cx } from "@/lib/cx";
import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Profile setup". */
  label: string;
  /** Visible text, e.g. "4 of 16". */
  text?: string;
  /** gold: progression (default) · data: measurements · success · boss */
  tone?: "gold" | "data" | "success" | "boss";
  size?: "sm" | "md";
}

/** Linear progress (V2 §23: the fill animates, briefly). */
export function ProgressBar({ value, max, label, text, tone = "gold", size = "sm" }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={styles.wrap}>
      <div
        className={cx(styles.track, styles[size])}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
      >
        <div className={cx(styles.fill, styles[tone])} style={{ width: `${percent}%` }} />
      </div>
      {text ? (
        <span className={cx("stat-number", styles.text)} aria-hidden="true">
          {text}
        </span>
      ) : null}
    </div>
  );
}
