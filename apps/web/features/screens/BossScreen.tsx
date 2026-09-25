import { ATTRIBUTE_LABELS } from "@ascend/shared";
import type { ReactNode } from "react";
import { Artwork } from "@/components/art/Artwork";
import type { BossRequirement, BossState } from "@/components/game/BossCard";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { StatusBadge, type DisplayStatus } from "@/components/ui/StatusBadge";
import type { ArtId } from "@/lib/art";
import { cx } from "@/lib/cx";
import styles from "./boss.module.css";

const STATE_BADGE: Record<BossState, { status: DisplayStatus; label: string }> = {
  undiscovered: { status: "locked", label: "Undiscovered" },
  available: { status: "available", label: "Available" },
  ready: { status: "ready", label: "Ready" },
  attempted: { status: "scheduled", label: "Attempted" },
  "not-defeated": { status: "failed", label: "Boss not defeated" },
  recoil: { status: "recoil", label: "Recoil" },
  revenge: { status: "revenge", label: "Revenge available" },
  defeated: { status: "defeated", label: "Defeated" },
};

export interface BossScreenProps {
  name: string;
  meaning: string;
  state: BossState;
  /** 0–100 preparation against the requirements — NOT a chance of success. */
  readiness: number | null;
  requirements: readonly BossRequirement[];
  art?: ArtId;
  /** The primary action (a Boss button), or an explanation when there is none. */
  action?: ReactNode;
  /** Page-level heading text; the Boss name is shown as art title below it. */
  heading?: string;
}

/**
 * Boss (V2 §19, pass 2): the most cinematic screen. The guardian dominates
 * the top half and the UI sits inside the scene. Readiness is preparation,
 * never a probability; an athlete may attempt at any Readiness.
 */
export function BossScreen({ name, meaning, state, readiness, requirements, art = "bosses.guardian-dormant", action, heading = "Bosses" }: BossScreenProps) {
  const badge = STATE_BADGE[state];
  const hidden = state === "undiscovered";
  return (
    <article className={cx(styles.screen, styles[state])}>
      <Artwork id={art} ratio="195 / 220" priority className={styles.art}>
        <div className={styles.topBar}>
          <h1 className={styles.kicker}>
            <PixelIcon name="boss" size={16} /> {heading}
          </h1>
          <StatusBadge status={badge.status} label={badge.label} size="sm" />
        </div>
        <div className={styles.titleBlock}>
          <p className={cx("text-fantasy", styles.name)}>{hidden ? "Undiscovered" : name}</p>
          <p className={styles.meaning}>{hidden ? "A guardian waits beyond what you have proven so far." : meaning}</p>
        </div>
      </Artwork>

      <div className={styles.panel}>
        {readiness !== null && !hidden ? (
          <section className={styles.readiness} aria-label="Readiness">
            <div className={styles.readinessTop}>
              <span className={styles.label}>Readiness</span>
              <span className={cx("stat-number", styles.readinessValue)}>{Math.round(readiness)}%</span>
            </div>
            <div className={styles.track} role="progressbar" aria-label="Boss readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(readiness)}>
              <span style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }} />
            </div>
            <p className={styles.note}>How prepared you are for its requirements — not a chance of winning.</p>
          </section>
        ) : null}

        {!hidden && requirements.length ? (
          <section aria-labelledby="req-heading">
            <h2 id="req-heading" className={styles.label}>
              Requirements
            </h2>
            <ul className={styles.reqs}>
              {requirements.map((req) => {
                const met = req.current !== null && req.current >= req.required;
                return (
                  <li key={req.attribute} className={cx(styles.req, met && styles.met)}>
                    <AttributeIcon attribute={req.attribute} size={24} muted={req.current === null} />
                    <span className={styles.reqName}>{ATTRIBUTE_LABELS[req.attribute]}</span>
                    <span className="stat-number">
                      {req.current ?? "—"} <span className={styles.reqOf}>/ {req.required}</span>
                    </span>
                    <PixelIcon name={met ? "check" : "lock"} size={16} title={met ? "Met" : "Not met yet"} />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </article>
  );
}
