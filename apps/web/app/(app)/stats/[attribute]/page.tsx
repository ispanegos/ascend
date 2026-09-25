import { ATTRIBUTE_LABELS, isAttributeKey, testName } from "@ascend/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getStatDetail } from "@/features/stats/data";
import { ConfidenceMeter } from "@/features/stats/StatList";
import styles from "@/features/stats/stats.module.css";
import { displayPercent, displayStat, readConfidence, readGaps, readSubdomains } from "@/features/stats/trace";
import { cx } from "@/lib/cx";

export async function generateMetadata({ params }: { params: Promise<{ attribute: string }> }): Promise<Metadata> {
  const { attribute } = await params;
  return { title: isAttributeKey(attribute) ? ATTRIBUTE_LABELS[attribute] : "Stat" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Stat detail foundation (spec §63): Current, Peak, Confidence, status,
 * evidence, subdomains, last verified, engine version, and why.
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
        <PageHeader title={label} />
        <EmptyState title="Not calculated yet" />
      </>
    );
  }

  const { stat } = detail;
  const subdomains = readSubdomains(stat.trace);
  const confidence = readConfidence(stat.trace);
  const gaps = readGaps(stat.trace);

  return (
    <>
      <Link href="/stats" className={styles.muted} style={{ display: "inline-flex", alignItems: "center", minHeight: 44 }}>
        <Icon name="chevron-left" size={18} /> Stats
      </Link>
      <PageHeader title={label} aside={<StatusBadge status={stat.status} />} />

      <div className="stack stack--lg">
        <section className={styles.hero} aria-label="Summary">
          <div className={cx(styles.figure, styles.primaryFigure)}>
            <span className={cx("stat-number", styles.figureValue)}>{displayStat(stat.current)}</span>
            <span className="text-label text-muted">Current</span>
          </div>
          <div className={styles.figure}>
            <span className={cx("stat-number", styles.figureValue, stat.peak === null && styles.muted)}>
              {displayStat(stat.peak)}
            </span>
            <span className="text-label text-muted">Peak</span>
          </div>
          <div className={styles.figure}>
            <span className={cx("stat-number", styles.figureValue)}>
              {stat.current === null ? "—" : displayPercent(stat.confidence)}
            </span>
            <span className="text-label text-muted">Confidence</span>
          </div>
        </section>

        {stat.current === null ? (
          <p>
            {label} is unranked: ASCEND has no evidence for it yet. That is unknown, not zero
            {attribute === "power" ? " — Spawn has no Power test by design." : "."}
          </p>
        ) : null}

        <section className={styles.section} aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-label text-muted">
            Why {displayStat(stat.current)}?
          </h2>
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
                <span className={cx("stat-number", !sd.observed && styles.muted)}>{sd.observed ? displayStat(sd.score) : "—"}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>Only measured subdomains count. Missing ones lower Confidence, never the score.</p>
        </section>

        {confidence && stat.current !== null ? (
          <section className={styles.section} aria-labelledby="confidence-heading">
            <h2 id="confidence-heading" className="text-label text-muted">
              Confidence {displayPercent(confidence.value)}
            </h2>
            <ul className={styles.table}>
              {(
                [
                  ["Coverage", confidence.coverage, "Share of this Stat's subdomains measured"],
                  ["Recency", confidence.recency, "How recent the evidence is"],
                  ["Repeatability", confidence.repeatability, "Consistency across repeated tests (default until repeated)"],
                  ["Quality", confidence.quality, "Measurement quality, lower with pain or capped results"],
                ] as const
              ).map(([name, value, hint]) => (
                <li key={name} className={styles.tableRow}>
                  <span>
                    {name}
                    <small>{hint}</small>
                  </span>
                  <span className={styles.meta}>
                    <ConfidenceMeter value={value} />
                    {displayPercent(value)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className="text-label text-muted">
            Evidence
          </h2>
          {detail.evidence.length ? (
            <ul className={styles.table}>
              {detail.evidence.map((e) => (
                <li key={e.id} className={styles.tableRow}>
                  <span>
                    {testName(e.testKey)}
                    <small>Spawn · {e.testKey}</small>
                  </span>
                  <span className={styles.muted}>{formatDate(e.occurredAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No evidence yet.</p>
          )}
          {gaps.length ? (
            <p className={styles.note}>
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
