import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./MetricCard.module.css";

/**
 * A single measured value: "SET 2 / 3", "REST 60s", "HR 128". Values are
 * cyan (measured data) and tabular (V2 §6, §20).
 */
export function MetricCard({
  label,
  value,
  unit,
  icon,
  tone = "data",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  tone?: "data" | "gold" | "neutral";
}) {
  return (
    <div className={cx(styles.card, styles[tone])}>
      <span className={styles.label}>{label}</span>
      <span className={styles.valueRow}>
        {icon}
        <span className={cx("stat-number", styles.value)}>{value}</span>
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </span>
    </div>
  );
}
