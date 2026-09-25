import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./States.module.css";

/*
 * Screen states required for every data screen (spec §50): loading, empty,
 * error, offline. Stale-data notices are composed from these in later
 * milestones.
 */

interface StateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, children, action }: StateProps) {
  return (
    <section className={styles.state} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      {children ? <div className={styles.body}>{children}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}

export function ErrorState({ title, children, action }: StateProps) {
  return (
    <section className={`${styles.state} ${styles.error}`} role="alert">
      <Icon name="alert" className={styles.icon} />
      <h2 className={styles.title}>{title}</h2>
      {children ? <div className={styles.body}>{children}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}

/**
 * Skeleton placeholder. The visual blocks are hidden from assistive tech and a
 * single polite status message is announced instead, avoiding content churn
 * (spec §40).
 */
export function LoadingState({ label = "Loading", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true" className={styles.skeleton}>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className={styles.line} />
        ))}
      </div>
    </div>
  );
}
