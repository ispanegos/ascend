import { isAttributeKey } from "@ascend/shared";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";
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

const RUNE: Record<NonNullable<LadderRow["tone"]>, PixelIconName> = {
  muted: "unranked",
  partial: "provisional",
  collected: "check",
};

/**
 * Overall + attributes for Spawn screens (V2 §21). Dormant runes light up as
 * data is collected. No numbers: Spawn collects evidence, it does not score.
 * Unknown is a word, never zero.
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
  const tone = (row: LadderRow) => row.tone ?? "muted";
  return (
    <section className={styles.ladder} aria-label={label}>
      <div className={styles.overall}>
        <span className={styles.ladderName}>
          <AttributeIcon attribute="overall" size={24} muted={tone(overall) === "muted"} />
          <span className={styles.overallName}>{overall.label}</span>
        </span>
        <span className={cx(styles.status, styles[tone(overall)])}>
          <PixelIcon name={RUNE[tone(overall)]} size={14} />
          {overall.status}
        </span>
      </div>
      <ul className={styles.rows}>
        {rows.map((row, index) => (
          <li key={row.key} className={styles.row} style={{ animationDelay: `${index * 40}ms` }}>
            <span className={styles.ladderName}>
              {isAttributeKey(row.key) ? <AttributeIcon attribute={row.key} size={20} muted={tone(row) === "muted"} /> : null}
              <span className={styles.rowName}>{row.label}</span>
            </span>
            <span className={cx(styles.status, styles[tone(row)])}>
              <PixelIcon name={RUNE[tone(row)]} size={14} />
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
