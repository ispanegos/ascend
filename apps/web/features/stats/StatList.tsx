import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from "@ascend/shared";
import Link from "next/link";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { Icon } from "@/components/ui/Icon";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cx } from "@/lib/cx";
import type { AthleteStats } from "./data";
import { displayPercent, displayStat } from "./trace";
import styles from "./stats.module.css";

/**
 * Overall + the seven attributes (V2 §18). A performance screen: measured
 * values in cyan, status in words and runes, no scenery behind numbers.
 * Integers only — stored values keep their decimals (spec §3).
 */
export function StatList({ stats, headingLevel = 2 }: { stats: AthleteStats; headingLevel?: 1 | 2 }) {
  const { overall } = stats;
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const overallValue = overall.current === null ? 0 : Math.min(100, Math.max(0, overall.current));
  return (
    <section className={styles.list} aria-label="Athlete Stats">
      <Link href="/stats" className={styles.overall}>
        <span className={styles.overallTop}>
          <span className={styles.overallTitle}>
            <AttributeIcon attribute="overall" size={20} muted={overall.current === null} />
            <Heading className={styles.overallName}>Overall</Heading>
          </span>
          <StatusBadge status={overall.status} />
        </span>
        <span className={cx("stat-number", styles.overallValue, overall.current === null && styles.unrankedValue)}>
          {displayStat(overall.current)}
        </span>
        <span className={styles.scale} aria-hidden="true">
          <span className={styles.scaleTrack}>
            <span className={styles.scaleFill} style={{ width: `${overallValue}%` }} />
          </span>
          <span className={cx("stat-number", styles.scaleEnds)}>
            <span>0</span>
            <span>100</span>
          </span>
        </span>
        {overall.current !== null ? (
          <span className={styles.meta}>
            <ConfidenceBar value={overall.confidence} status={overall.status} />
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
              <Link href={`/stats/${key}`} className={cx(styles.row, unranked && styles.rowUnranked)}>
                <span className={styles.rowIcon}>
                  <AttributeIcon attribute={key} size={28} muted={unranked} />
                </span>
                <span className={styles.rowMain}>
                  <span className={styles.rowName}>{ATTRIBUTE_LABELS[key]}</span>
                  <span className={cx("stat-number", styles.rowValue, unranked && styles.unrankedValue)}>
                    {displayStat(stat.current)}
                  </span>
                </span>
                <span className={styles.rowMeta}>
                  {unranked ? (
                    <>
                      <PixelIcon name="unranked" size={14} />
                      Unranked
                    </>
                  ) : (
                    <>
                      <ConfidenceBar value={stat.confidence} status={stat.status} />
                      Confidence {displayPercent(stat.confidence)}
                      {stat.status === "verified" ? " · Verified" : ""}
                    </>
                  )}
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
