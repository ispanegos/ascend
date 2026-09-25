import { ATTRIBUTE_LABELS, isAttributeKey, testName } from "@ascend/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { AttributeIcon } from "@/components/ui/AttributeIcon";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getStatDetail } from "@/features/stats/data";
import styles from "@/features/stats/stats.module.css";
import {
  displayPercent,
  displayStat,
  readConfidence,
  readEstimate,
  readGaps,
  readLongitudinal,
  readSubdomains,
} from "@/features/stats/trace";
import { cx } from "@/lib/cx";

export async function generateMetadata({ params }: { params: Promise<{ attribute: string }> }): Promise<Metadata> {
  const { attribute } = await params;
  return { title: isAttributeKey(attribute) ? ATTRIBUTE_LABELS[attribute] : "Stat" };
}

const SOURCE_LABEL: Record<string, string> = {
  spawn_test: "Spawn",
  reassessment: "Reassessment",
  workout: "Workout",
  verified_workout: "Verified workout",
  wearable: "Wearable",
  boss: "Boss",
  manual: "Manual",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Stat detail (spec §63, V2 §18): Current, Peak, Confidence, status, why this
 * score, evidence. A data screen — runes and type, no scenery.
 */
export default async function StatDetailPage({ params }: { params: Promise<{ attribute: string }> }) {
  const { attribute } = await params;
  if (!isAttributeKey(attribute)) notFound();
  const user = await requireInitializedAthlete();
  const detail = await getStatDetail(user.id, attribute);
  const label = ATTRIBUTE_LABELS[attribute];

  if (!detail) {
    return (
      <>
        <ScreenHeader title={label} />
        <EmptyState title="Not calculated yet" />
      </>
    );
  }

  const { stat } = detail;
  const subdomains = readSubdomains(stat.trace);
  const confidence = readConfidence(stat.trace);
  const gaps = readGaps(stat.trace);
  const longitudinal = readLongitudinal(stat.trace);
  const estimate = readEstimate(stat.trace);
  // Only worth a sentence when the cautious estimate changes the displayed integer.
  const adjusted =
    estimate !== null && stat.current !== null && displayStat(estimate.observed) !== displayStat(stat.current);
  const unranked = stat.current === null;

  return (
    <>
      <Link href="/stats" className={styles.back}>
        <Icon name="chevron-left" size={18} /> Stats
      </Link>
      <header className={styles.detailTitle}>
        <span className={styles.detailName}>
          <AttributeIcon attribute={attribute} size={32} muted={unranked} />
          <h1>{label}</h1>
        </span>
      </header>

      <div className="stack stack--lg">
        <section className={styles.figures} aria-label="Summary">
          <div className={cx(styles.figure, !unranked && styles.current)}>
            <span className={styles.figureLabel}>Current</span>
            <span className={cx("stat-number", styles.figureValue, unranked && styles.muted)}>{displayStat(stat.current)}</span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Peak</span>
            {stat.verifiedPeak !== null ? (
              <span className={cx("stat-number", styles.figureValue, styles.peakValue)}>
                <PixelIcon name="peak" size={20} />
                {displayStat(stat.verifiedPeak)}
              </span>
            ) : (
              <>
                <span className={cx("stat-number", styles.figureValue, styles.muted)}>—</span>
                {stat.current !== null ? <span className={styles.peakNote}>Not verified yet</span> : null}
              </>
            )}
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Confidence</span>
            <span className={cx("stat-number", styles.figureValue)}>{unranked ? "—" : displayPercent(stat.confidence)}</span>
            {unranked ? null : <ConfidenceBar value={stat.confidence} status={stat.status} />}
          </div>
          <div className={cx(styles.figure, styles.statusFigure)}>
            <span className={styles.figureLabel}>Status</span>
            <StatusBadge status={stat.status} />
          </div>
        </section>

        {unranked ? (
          <p className="text-muted">
            {label} is unranked: ASCEND has no evidence for it yet. That is unknown, not zero
            {attribute === "power" ? " — Spawn has no Power test by design." : "."}
          </p>
        ) : null}

        {longitudinal && !unranked && !longitudinal.eligible ? (
          <p className={styles.calibrating}>
            <PixelIcon name="provisional" size={16} />
            <span>
              Provisional. Spawn sets your starting point; {label} can become verified after an independent result on a
              later day — a reassessment, a verified workout or a Boss.
              {attribute === "recovery" ? " Recovery also needs workload or sleep evidence." : ""}
            </span>
          </p>
        ) : null}

        <section className={styles.section} aria-labelledby="why-heading">
          <SectionHeader id="why-heading" title="Why this score?" aside={unranked ? undefined : displayStat(stat.current)} />
          <ul className={styles.table}>
            {subdomains.map((sd) => (
              <li key={sd.name} className={styles.tableRow}>
                <span>
                  {sd.label}
                  <small>
                    {sd.observed
                      ? `${sd.tests.map(testName).join(", ")} · ${Math.round((sd.share ?? 0) * 100)}% of the score`
                      : `Not measured — ${sd.missingReason}`}
                  </small>
                </span>
                {sd.observed && sd.score !== null ? (
                  <span className={styles.subScore}>
                    <span className="stat-number">{displayStat(sd.score)}</span>
                    <span className={styles.subBar} aria-hidden="true">
                      <span style={{ width: `${Math.min(100, Math.max(0, sd.score))}%` }} />
                    </span>
                  </span>
                ) : (
                  <span className={cx("stat-number", styles.muted)}>—</span>
                )}
              </li>
            ))}
          </ul>
          {adjusted ? (
            <p className={styles.note} style={{ marginTop: "var(--space-3)" }}>
              Measured results alone give {displayStat(estimate.observed)}. Some tests have no result yet, so ASCEND
              holds the score to a cautious {displayStat(stat.current)} until they do. Missing results never count as
              zero and never raise a Stat.
            </p>
          ) : (
            <p className={styles.note} style={{ marginTop: "var(--space-3)" }}>
              Missing results lower Confidence. They never count as zero and never raise a Stat.
            </p>
          )}
        </section>

        {confidence && !unranked ? (
          <section className={styles.section} aria-labelledby="confidence-heading">
            <SectionHeader id="confidence-heading" title="Confidence" aside={displayPercent(confidence.value)} />
            <ul className={styles.table}>
              {(
                [
                  ["Coverage", confidence.coverage, "Share of this Stat's subdomains measured"],
                  ["Recency", confidence.recency, "How recent the evidence is"],
                  ["Repeatability", confidence.repeatability, "Consistency across results on different days (default until repeated)"],
                  ["Quality", confidence.quality, "Measurement quality, lower with pain or capped results"],
                ] as const
              ).map(([name, value, hint]) => (
                <li key={name} className={styles.tableRow}>
                  <span>
                    {name}
                    <small>{hint}</small>
                  </span>
                  <span className={styles.meta}>
                    <ConfidenceBar value={value} status={stat.status} />
                    {displayPercent(value)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="evidence-heading">
          <SectionHeader id="evidence-heading" title="Evidence" aside={detail.evidence.length || undefined} />
          {detail.evidence.length ? (
            <ul className={styles.table}>
              {detail.evidence.map((e) => (
                <li key={e.id} className={styles.tableRow}>
                  <span>
                    {testName(e.testKey)}
                    <small>
                      {SOURCE_LABEL[e.sourceType] ?? "Evidence"} · {e.testKey}
                    </small>
                  </span>
                  <span className={cx("stat-number", styles.muted)}>{formatDate(e.occurredAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No evidence yet.</p>
          )}
          {gaps.length ? (
            <p className={styles.note} style={{ marginTop: "var(--space-3)" }}>
              Without a result: {gaps.map((g) => testName(g.testKey)).join(", ")}. Nothing is assumed about them.
            </p>
          ) : null}
        </section>

        <p className={styles.note}>
          {detail.lastVerifiedAt ? `Last verified ${formatDate(detail.lastVerifiedAt)}. ` : "Not verified yet. "}
          Engine {detail.engineVersion} · {detail.calibrationStatus} calibration — ASCEND&apos;s own scale, not a
          percentile.
        </p>
      </div>
    </>
  );
}
