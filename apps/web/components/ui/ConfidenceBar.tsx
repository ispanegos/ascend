import type { StatStatus } from "@ascend/shared";
import { cx } from "@/lib/cx";
import styles from "./ConfidenceBar.module.css";

/**
 * Confidence: how certain ASCEND is, never how good the athlete is (spec §6).
 * Ten segments, so the value reads at a glance without looking like a skill
 * bar. Decorative — the percentage is always written next to it.
 */
export function ConfidenceBar({ value, status }: { value: number; status: StatStatus }) {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * 10);
  return (
    <span className={cx(styles.bar, styles[status])} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={cx(styles.segment, i < filled && styles.on)} />
      ))}
    </span>
  );
}
