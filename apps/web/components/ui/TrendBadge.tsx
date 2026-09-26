import type { Trend } from "@ascend/shared";
import styles from "./TrendBadge.module.css";

const TEXT = { improving: "Improving", stable: "Stable", declining: "Declining" } as const;
const ARROW = { improving: "↑", stable: "→", declining: "↓" } as const;

/**
 * Trend (ADR-042). Shows nothing for insufficient history unless asked —
 * a single snapshot is never a trend.
 */
export function TrendBadge({ trend, showInsufficient = false }: { trend: Trend; showInsufficient?: boolean }) {
  if (trend.state === "insufficient_history") {
    return showInsufficient ? <span className={styles.insufficient}>Not enough history yet</span> : null;
  }
  return (
    <span className={`${styles.trend} ${styles[trend.state]}`}>
      <span aria-hidden="true">{ARROW[trend.state]}</span> {TEXT[trend.state]}
    </span>
  );
}
