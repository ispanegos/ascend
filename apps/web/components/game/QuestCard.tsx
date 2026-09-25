import { ATTRIBUTE_LABELS, type AttributeKey } from "@ascend/shared";
import Link from "next/link";
import { Artwork } from "@/components/art/Artwork";
import { PixelArtFrame } from "@/components/art/PixelArtFrame";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ArtId } from "@/lib/art";
import { cx } from "@/lib/cx";
import styles from "./QuestCard.module.css";

export type QuestStatus = "available" | "active" | "completed" | "locked" | "failed" | "scheduled";

export interface QuestCardProps {
  title: string;
  description: string;
  /** e.g. "35 min". */
  duration: string;
  /** Attributes this Quest produces evidence for. Evidence, not a promised increase. */
  evidenceFor: readonly AttributeKey[];
  status: QuestStatus;
  art?: ArtId;
  href?: string;
}

/**
 * Quest card (V2 §16). No XP, no coins: the "reward" is evidence for real
 * Stats, and completing a Quest never guarantees a Stat increase.
 */
export function QuestCard({ title, description, duration, evidenceFor, status, art, href }: QuestCardProps) {
  const body = (
    <>
      <PixelArtFrame tone={status === "active" ? "gold" : "default"} className={styles.thumb}>
        {art ? (
          <Artwork id={art} ratio="1 / 1" />
        ) : (
          <span className={styles.thumbFallback}>
            <AttributeIcon attribute={evidenceFor[0] ?? "overall"} size={32} />
          </span>
        )}
      </PixelArtFrame>
      <span className={styles.main}>
        <span className={styles.top}>
          <span className={styles.title}>{title}</span>
          <StatusBadge status={status} size="sm" />
        </span>
        <span className={styles.description}>{description}</span>
        <span className={styles.meta}>
          <span className="stat-number">{duration}</span>
          <span className={styles.evidence}>
            <span className={styles.evidenceLabel}>Evidence</span>
            {evidenceFor.map((attribute) => (
              <span key={attribute} className={styles.attr}>
                <AttributeIcon attribute={attribute} size={14} />
                {ATTRIBUTE_LABELS[attribute]}
              </span>
            ))}
          </span>
        </span>
      </span>
      {href ? <Icon name="chevron-right" size={18} className={styles.chevron} /> : null}
    </>
  );
  const className = cx(styles.card, styles[status]);
  return href && status !== "locked" ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
