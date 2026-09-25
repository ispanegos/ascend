import type { StatStatus } from "@ascend/shared";
import { cx } from "@/lib/cx";
import styles from "./StatusBadge.module.css";

const LABELS: Record<StatStatus, string> = {
  unranked: "Unranked",
  provisional: "Provisional",
  verified: "Verified",
};

/**
 * Stat status (spec §2, §6). Each status differs in text AND shape — dotted,
 * dashed or solid border with fill — so it never relies on colour alone
 * (spec §40).
 */
export function StatusBadge({ status, className }: { status: StatStatus; className?: string }) {
  return (
    <span className={cx(styles.badge, styles[status], className)} data-status={status}>
      {LABELS[status]}
    </span>
  );
}
