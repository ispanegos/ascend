import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import styles from "./FlowHeader.module.css";

interface FlowHeaderProps {
  /** Previous screen. Omit on the first screen of a flow. */
  backHref?: string | undefined;
  /** Short context, e.g. "SPAWN 01 · MOVEMENT". */
  context?: string | undefined;
  progress?: { value: number; max: number; label: string; text: string } | undefined;
  /** Where "Exit" goes. Everything is saved as the athlete goes. */
  exitHref?: string;
}

/**
 * Top bar for focused flows (Spawn, profile edits; spec §25). Back and Exit
 * are real links so they work before hydration and with the keyboard.
 */
export function FlowHeader({ backHref, context, progress, exitHref = "/today" }: FlowHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {backHref ? (
          <Link href={backHref} className={styles.icon} aria-label="Back">
            <Icon name="chevron-left" />
          </Link>
        ) : (
          <span className={styles.spacer} aria-hidden="true" />
        )}
        <div className={styles.middle}>
          {context ? <p className={`text-label ${styles.context}`}>{context}</p> : null}
          {progress ? <ProgressBar {...progress} /> : null}
        </div>
        <Link href={exitHref} className={styles.exit} aria-label="Exit. Your progress is saved.">
          Exit
        </Link>
      </div>
    </header>
  );
}
