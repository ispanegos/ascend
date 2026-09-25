import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from "@ascend/shared";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import type { AthleteStats } from "./data";
import { displayPercent, displayStat } from "./trace";
import styles from "./stats.module.css";

const STATUS_TEXT = { unranked: "Unranked", provisional: "Provisional", verified: "Verified" } as const;

/**
 * A quiet confidence line: certainty of the estimate, never ability (spec §6,
 * §35). Decorative — the percentage is always written next to it.
 */
export function ConfidenceMeter({ value }: { value: number }) {
  return (
    <span className={styles.meter} aria-hidden="true">
      <span className={styles.meterFill} style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

/**
 * Overall + the seven attributes (spec §35, §60). Integers only: the stored
 * values keep their decimals. Status is spelled out, never colour alone.
 */
export function StatList({ stats, headingLevel = 2 }: { stats: AthleteStats; headingLevel?: 1 | 2 }) {
  const { overall } = stats;
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={styles.list} aria-label="Athlete Stats">
      <Link href="/stats" className={styles.overall}>
        <span className={styles.overallTop}>
          <Heading className={styles.overallName}>Overall</Heading>
          <span className={cx(styles.status, styles[overall.status])}>{STATUS_TEXT[overall.status]}</span>
        </span>
        <span className={cx("stat-number", styles.overallValue)}>{displayStat(overall.current)}</span>
        {overall.current !== null ? (
          <span className={styles.meta}>
            <ConfidenceMeter value={overall.confidence} />
            Confidence {displayPercent(overall.confidence)}
          </span>
        ) : (
          <span className={styles.meta}>Needs Endurance, Strength, Core, Mobility and Agility.</span>
        )}
      </Link>
      <ul className={styles.rows}>
        {ATTRIBUTE_KEYS.map((key) => {
          const stat = stats.stats[key];
          const unranked = stat.current === null;
          return (
            <li key={key}>
              <Link href={`/stats/${key}`} className={styles.row}>
                <span className={styles.rowName}>{ATTRIBUTE_LABELS[key]}</span>
                <span className={styles.rowRight}>
                  <span className={cx("stat-number", styles.rowValue, unranked && styles.unrankedValue)}>
                    {displayStat(stat.current)}
                  </span>
                  <span className={styles.rowMeta}>
                    {unranked ? (
                      "Unranked"
                    ) : (
                      <>
                        <ConfidenceMeter value={stat.confidence} />
                        Confidence {displayPercent(stat.confidence)}
                        {stat.status === "verified" ? " · Verified" : ""}
                      </>
                    )}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} className={styles.chevron} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
