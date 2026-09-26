import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type AttributeKey, type StatStatus } from "@ascend/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { Artwork } from "@/components/art/Artwork";
import { QuestCard, type QuestCardProps } from "@/components/game/QuestCard";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { ButtonLink } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cx } from "@/lib/cx";
import styles from "./today.module.css";

export interface StatSummary {
  current: number | null;
  confidence: number;
  status: StatStatus;
}

export interface PathLine extends StatSummary {
  attribute: AttributeKey;
}

export interface TodayScreenProps {
  name: string | null;
  dayLabel: ReactNode;
  overall: StatSummary | null;
  attributes: Record<AttributeKey, StatSummary> | null;
  /**
   * Today's primary area: a Quest (M5+), the athlete's Paths once chosen, or
   * the current objective (choose Paths).
   */
  primary:
    | { kind: "quest"; quest: QuestCardProps }
    | { kind: "paths"; primary: PathLine; secondary: readonly PathLine[] }
    | { kind: "objective"; title: string; text: string; href: string; cta: string };
  next: { title: string; text: string };
}

/** Greets by first name from the profile; "Athlete" when there is none. Never a Spawn state. */
function firstName(name: string | null): string {
  return name?.trim().split(/\s+/)[0] || "Athlete";
}

const round = (value: number | null) => (value === null ? "—" : String(Math.round(value)));

/**
 * Today (V2 §15, pass 2): compact status on top, a moderate atmospheric hero,
 * dense real athlete information, today's activity and the next milestone.
 * No XP, levels or currencies.
 */
export function TodayScreen({ name, dayLabel, overall, attributes, primary, next }: TodayScreenProps) {
  const verified = attributes ? ATTRIBUTE_KEYS.filter((key) => attributes[key].status === "verified").length : 0;
  return (
    <>
      <header className={styles.top}>
        <div className={styles.titles}>
          <p className={styles.day}>{dayLabel}</p>
          <h1 className={styles.title}>Today</h1>
        </div>
        {overall ? (
          <Link href="/stats" className={styles.overall} aria-label={`Overall ${round(overall.current)}, ${overall.status}. View Stats`}>
            <span className={styles.overallLabel}>Overall</span>
            <span className={cx("stat-number", styles.overallValue)}>{round(overall.current)}</span>
            <StatusBadge status={overall.status} size="sm" />
          </Link>
        ) : null}
      </header>

      <Artwork id="world.dusk-ruins" ratio="2 / 1" priority scrim="bottom" className={styles.hero}>
        <p className={cx("text-fantasy", styles.greeting)}>{`Welcome back, ${firstName(name)}`}</p>
      </Artwork>

      <div className="stack stack--lg">
        {attributes ? (
          <section aria-labelledby="athlete-heading">
            <SectionHeader id="athlete-heading" title="Your athlete" aside={`${verified} / 7 verified`} />
            <ul className={styles.attributes}>
              {ATTRIBUTE_KEYS.map((key) => {
                const stat = attributes[key];
                return (
                  <li key={key}>
                    <Link href={`/stats/${key}`} className={styles.attribute} aria-label={`${ATTRIBUTE_LABELS[key]} ${stat.current === null ? "unranked" : round(stat.current)}`}>
                      <AttributeIcon attribute={key} size={24} muted={stat.current === null} />
                      <span className={cx("stat-number", styles.attributeValue, stat.current === null && styles.unranked)}>
                        {round(stat.current)}
                      </span>
                      <span className={styles.attributeName}>{ATTRIBUTE_LABELS[key].slice(0, 3)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="activity-heading">
          <SectionHeader
            id="activity-heading"
            title={primary.kind === "quest" ? "Today's Quest" : primary.kind === "paths" ? "Your direction" : "Current objective"}
          />
          {primary.kind === "quest" ? (
            <QuestCard {...primary.quest} />
          ) : primary.kind === "paths" ? (
            <div className={styles.paths}>
              <ul className={styles.pathList}>
                {[primary.primary, ...primary.secondary].map((line, index) => (
                  <li key={line.attribute} className={cx(styles.pathLine, index === 0 && styles.pathPrimary)}>
                    <AttributeIcon attribute={line.attribute} size={24} muted={line.current === null} />
                    <span className={styles.pathName}>
                      {ATTRIBUTE_LABELS[line.attribute]}
                      <span className={styles.pathPriority}>{index === 0 ? "Primary" : "Secondary"}</span>
                    </span>
                    <span className={cx("stat-number", styles.pathValue, line.current === null && styles.unranked)}>
                      {round(line.current)}
                    </span>
                    <StatusBadge status={line.status} size="sm" />
                  </li>
                ))}
              </ul>
              <p className={styles.objectiveBody}>
                Training generation is the next stage: ASCEND will build your Quests from these Paths.
              </p>
              <ButtonLink href="/ascend/paths" variant="secondary">
                Review your paths
              </ButtonLink>
            </div>
          ) : (
            <div className={styles.objective}>
              <span className={styles.objectiveScene} aria-hidden="true">
                <Artwork id="quests.training-grounds" ratio="3 / 2" />
              </span>
              <span className={styles.objectiveIcon}>
                <PixelIcon name="ascend" size={24} />
              </span>
              <div className={styles.objectiveText}>
                <p className={styles.objectiveTitle}>{primary.title}</p>
                <p className={styles.objectiveBody}>{primary.text}</p>
              </div>
              <ButtonLink href={primary.href} className={styles.objectiveAction}>
                {primary.cta}
              </ButtonLink>
            </div>
          )}
        </section>

        <section aria-labelledby="next-heading">
          <SectionHeader id="next-heading" title="Next milestone" />
          <div className={styles.next}>
            <PixelIcon name="verified" size={32} className={styles.nextIcon} />
            <div className={styles.nextText}>
              <p className={styles.nextTitle}>{next.title}</p>
              <p className={styles.objectiveBody}>{next.text}</p>
              <ProgressBar value={verified} max={7} label="Verified Stats" text={`${verified} / 7`} tone="success" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
