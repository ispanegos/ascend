import type { StatStatus } from "@ascend/shared";
import { cx } from "@/lib/cx";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import styles from "./StatusBadge.module.css";

/**
 * Every display status in V2 (§14). Stat statuses come from the engine; the
 * others are visual vocabulary for Quests and Bosses in later milestones.
 */
export type DisplayStatus =
  | StatStatus
  | "peak"
  | "new-peak"
  | "recoil"
  | "revenge"
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "failed"
  | "scheduled"
  | "ready"
  | "defeated";

const META: Record<DisplayStatus, { label: string; icon: PixelIconName }> = {
  unranked: { label: "Unranked", icon: "unranked" },
  provisional: { label: "Provisional", icon: "provisional" },
  verified: { label: "Verified", icon: "verified" },
  peak: { label: "Peak", icon: "peak" },
  "new-peak": { label: "New Peak", icon: "peak" },
  recoil: { label: "Recoil", icon: "recoil" },
  revenge: { label: "Revenge available", icon: "revenge" },
  locked: { label: "Locked", icon: "lock" },
  available: { label: "Available", icon: "quest" },
  active: { label: "Active", icon: "quest" },
  completed: { label: "Completed", icon: "check" },
  failed: { label: "Not completed", icon: "recoil" },
  scheduled: { label: "Scheduled", icon: "provisional" },
  ready: { label: "Ready", icon: "check" },
  defeated: { label: "Defeated", icon: "verified" },
};

/**
 * Status chip: a pixel rune, a word and a tone — never colour alone
 * (V2 §14, §27). `label` overrides the word when context needs it.
 */
export function StatusBadge({
  status,
  label,
  className,
  size = "md",
}: {
  status: DisplayStatus;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = META[status];
  return (
    <span className={cx(styles.badge, styles[status], size === "sm" && styles.sm, className)} data-status={status}>
      <PixelIcon name={meta.icon} size={size === "sm" ? 12 : 16} />
      {label ?? meta.label}
    </span>
  );
}
