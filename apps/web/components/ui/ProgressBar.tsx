import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Profile setup". */
  label: string;
  /** Visible text, e.g. "4 of 16". */
  text?: string;
}

/** Linear step progress for onboarding and assessment flows. */
export function ProgressBar({ value, max, label, text }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      {text ? (
        <span className={styles.text} aria-hidden="true">
          {text}
        </span>
      ) : null}
    </div>
  );
}
