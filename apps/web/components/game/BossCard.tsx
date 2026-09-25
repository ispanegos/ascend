import { ATTRIBUTE_LABELS, type AttributeKey } from "@ascend/shared";
import { Artwork } from "@/components/art/Artwork";
import { PixelArtFrame } from "@/components/art/PixelArtFrame";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge, type DisplayStatus } from "@/components/ui/StatusBadge";
import type { ArtId } from "@/lib/art";
import { cx } from "@/lib/cx";
import styles from "./BossCard.module.css";

export type BossState =
  | "undiscovered"
  | "available"
  | "ready"
  | "attempted"
  | "not-defeated"
  | "recoil"
  | "revenge"
  | "defeated";

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

export interface BossRequirement {
  attribute: AttributeKey;
  /** The athlete's rounded Current; null when unranked. */
  current: number | null;
  required: number;
}

export interface BossCardProps {
  name: string;
  meaning: string;
  state: BossState;
  /** 0–100. Preparation against the requirements — NOT a chance of success. */
  readiness: number | null;
  requirements: readonly BossRequirement[];
  art?: ArtId;
}

/**
 * Boss (V2 §19): the one place ASCEND becomes cinematic. Readiness describes
 * preparation, never a probability; an athlete may attempt a Boss at any
 * Readiness. State shows through lighting and border, plus words.
 */
export function BossCard({ name, meaning, state, readiness, requirements, art = "bosses.guardian-dormant" }: BossCardProps) {
  const badge = STATE_BADGE[state];
  const hidden = state === "undiscovered";
  return (
    <article className={cx(styles.card, styles[state])} aria-label={hidden ? "Undiscovered Boss" : `Boss: ${name}`}>
      <p className={styles.kicker}>
        <PixelIcon name="boss" size={16} /> Boss
      </p>
      <PixelArtFrame tone="boss" className={styles.frame}>
        <Artwork id={art} ratio="6 / 7" className={styles.art} />
      </PixelArtFrame>
      <div className={styles.titleRow}>
        <h2 className={cx("text-fantasy", styles.name)}>{hidden ? "? ? ?" : name}</h2>
        <StatusBadge status={badge.status} label={badge.label} size="sm" />
      </div>
      <p className={styles.meaning}>{hidden ? "A guardian waits beyond what you have proven so far." : meaning}</p>

      {readiness !== null && !hidden ? (
        <div className={styles.readiness}>
          <div className={styles.readinessTop}>
            <span className={styles.readinessLabel}>Readiness</span>
            <span className={cx("stat-number", styles.readinessValue)}>{Math.round(readiness)}%</span>
          </div>
          <ProgressBar value={readiness} max={100} label="Boss readiness" tone="boss" size="md" />
          <p className={styles.note}>How prepared you are for its requirements — not a chance of winning.</p>
        </div>
      ) : null}

      {!hidden && requirements.length ? (
        <section aria-label="Requirements">
          <h3 className={styles.reqHeading}>Requirements</h3>
          <ul className={styles.reqs}>
            {requirements.map((req) => {
              const met = req.current !== null && req.current >= req.required;
              return (
                <li key={req.attribute} className={cx(styles.req, met && styles.met)}>
                  <AttributeIcon attribute={req.attribute} size={20} muted={req.current === null} />
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
    </article>
  );
}
