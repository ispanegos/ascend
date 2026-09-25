import type { ReactNode } from "react";
import { Artwork } from "@/components/art/Artwork";
import type { ArtId } from "@/lib/art";
import { Icon } from "./Icon";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import styles from "./States.module.css";

/*
 * Screen states required for every data screen: loading, empty, error,
 * locked. Empty and locked can carry a small piece of art (V2 §25).
 */

interface StateProps {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Optional atmospheric art above the text. */
  art?: ArtId;
  icon?: PixelIconName;
}

export function EmptyState({ title, children, action, art, icon }: StateProps) {
  return (
    <section className={styles.state} aria-label={title}>
      {art ? <Artwork id={art} ratio="3 / 1" className={styles.art} /> : null}
      <div className={styles.inner}>
        {icon ? <PixelIcon name={icon} size={32} className={styles.rune} /> : null}
        <h2 className={styles.title}>{title}</h2>
        {children ? <div className={styles.body}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </section>
  );
}

/** Something that exists but is not open yet. Never presented as failure. */
export function LockedState({ title, children, action, art = "states.sealed-gate" }: StateProps) {
  return (
    <section className={`${styles.state} ${styles.locked}`} aria-label={title}>
      <Artwork id={art} ratio="3 / 1" className={styles.art} />
      <div className={styles.inner}>
        <p className={styles.lockLabel}>
          <PixelIcon name="lock" size={16} /> Locked
        </p>
        <h2 className={styles.title}>{title}</h2>
        {children ? <div className={styles.body}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </section>
  );
}

export function ErrorState({ title, children, action }: StateProps) {
  return (
    <section className={`${styles.state} ${styles.error}`} role="alert">
      <div className={styles.inner}>
        <Icon name="alert" className={styles.icon} />
        <h2 className={styles.title}>{title}</h2>
        {children ? <div className={styles.body}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </section>
  );
}

/**
 * Skeleton placeholder. The blocks are hidden from assistive tech; one polite
 * status message is announced instead.
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
