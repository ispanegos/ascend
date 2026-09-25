import { cx } from "@/lib/cx";
import styles from "./spawn.module.css";

export interface LadderRow {
  key: string;
  label: string;
  /** Status text, e.g. "Unranked" or "Calibration data collected". */
  status: string;
  /** Visual weight of the status: `muted` for unknown/not assessed. */
  tone?: "muted" | "partial" | "collected";
}

/**
 * Overall + attribute list for Spawn screens. Deliberately a typographic
 * list, not a character sheet: no bars, no numbers, no colours per Stat
 * (spec §27, §35). Unknown is shown as a word, never as zero.
 */
export function AttributeLadder({
  overall,
  rows,
  label,
}: {
  overall: LadderRow;
  rows: readonly LadderRow[];
  label: string;
}) {
  return (
    <section className={styles.ladder} aria-label={label}>
      <div className={styles.overall}>
        <span className={styles.overallName}>{overall.label}</span>
        <span className={cx(styles.status, styles.overallStatus, overall.tone && styles[overall.tone])}>
          {overall.status}
        </span>
      </div>
      <ul className={styles.rows}>
        {rows.map((row, index) => (
          <li key={row.key} className={styles.row} style={{ animationDelay: `${index * 40}ms` }}>
            <span className={styles.rowName}>{row.label}</span>
            <span className={cx(styles.status, row.tone && styles[row.tone])}>
              {row.tone === "collected" ? <span aria-hidden="true">✓ </span> : null}
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
