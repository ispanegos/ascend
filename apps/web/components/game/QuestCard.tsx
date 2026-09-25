import { ATTRIBUTE_LABELS, type AttributeKey } from "@ascend/shared";
import Link from "next/link";
import { Artwork } from "@/components/art/Artwork";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ArtId } from "@/lib/art";
import { cx } from "@/lib/cx";
import styles from "./QuestCard.module.css";

export type QuestStatus = "available" | "active" | "completed" | "locked" | "failed" | "scheduled";

/** The kind of evidence a Quest produces — never XP. */
export type QuestEvidence = "Assessment" | "Workout" | "Verified workout" | "Boss";

export interface QuestCardProps {
  title: string;
  description: string;
  /** e.g. "35 min". */
  duration: string;
  /** Attributes this Quest produces evidence for. Evidence, not a promised increase. */
  affects: readonly AttributeKey[];
  evidence: QuestEvidence;
  status: QuestStatus;
  art?: ArtId;
  href?: string;
}

/**
 * Quest card (V2 §16, pass 2): an illustrated scene fades into the card.
 * No XP or coins — it says what the Quest affects and what kind of evidence
 * it produces. Completing it never guarantees a Stat increase.
 */
export function QuestCard({ title, description, duration, affects, evidence, status, art, href }: QuestCardProps) {
  const lead = affects[0] ?? "overall";
  const body = (
    <>
      {art ? (
        <span className={styles.scene} aria-hidden="true">
          <Artwork id={art} ratio="3 / 2" />
        </span>
      ) : null}
      <span className={styles.icon}>
        <AttributeIcon attribute={lead} size={24} muted={status === "locked"} />
      </span>
      <span className={styles.main}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>
          {description} · <span className="stat-number">{duration}</span>
        </span>
        <span className={styles.facts}>
          <span className={styles.fact}>
            <span className={styles.factLabel}>Affects</span>
            {affects.map((attribute) => ATTRIBUTE_LABELS[attribute]).join(" · ")}
          </span>
          <span className={styles.fact}>
            <span className={styles.factLabel}>Evidence</span>
            {evidence}
          </span>
        </span>
      </span>
      <span className={styles.state}>
        {status === "completed" ? (
          <span className={styles.done} title="Completed">
            <PixelIcon name="check" size={16} />
            <span className="visually-hidden">Completed</span>
          </span>
        ) : status === "active" ? null : (
          <StatusBadge status={status} size="sm" />
        )}
      </span>
    </>
  );
  const className = cx(styles.card, styles[status], art && styles.withArt);
  return href && status !== "locked" ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
