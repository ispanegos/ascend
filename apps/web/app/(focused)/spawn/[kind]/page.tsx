import {
  ATTRIBUTE_LABELS,
  SESSION_CATALOG,
  SESSION_KINDS,
  attributeCoverage,
  attributesForSession,
  completedTestKeys,
  isSessionComplete,
  isSessionKind,
  nextTest,
  sessionAvailability,
  testProgress,
  testsForSession,
  toResultSummaries,
  type CoverageStatus,
  type SessionKind,
} from "@ascend/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlowHeader } from "@/components/shell/FlowHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { completeSession } from "@/features/spawn/actions";
import { ActionButton } from "@/features/spawn/components/ActionButton";
import { AttributeLadder } from "@/features/spawn/components/AttributeLadder";
import { Preflight } from "@/features/spawn/components/Preflight";
import styles from "@/features/spawn/components/spawn.module.css";
import { getAllSpawnResults, getSessionView, type ResultRow, type SessionView } from "@/features/spawn/data";
import { SPAWN_COMPLETE_PATH, sessionPath, testPath } from "@/features/spawn/routing";
import { requireUser } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  return { title: isSessionKind(kind) ? SESSION_CATALOG[kind].title : "Spawn" };
}

const COVERAGE_TEXT: Record<CoverageStatus, string> = {
  collected: "Calibration data collected",
  partial: "Partially assessed",
  not_assessed: "Not assessed",
};

const TONE: Record<CoverageStatus, "collected" | "partial" | "muted"> = {
  collected: "collected",
  partial: "partial",
  not_assessed: "muted",
};

/** Each session's rune (V2 §21): the attribute family it mostly measures. */
const SESSION_RUNE: Record<SessionKind, PixelIconName> = { movement: "mobility", frame: "strength", engine: "endurance" };

const PROGRESS_TEXT: Record<string, string> = {
  not_started: "To do",
  in_progress: "In progress",
  completed: "Recorded",
  skipped: "Skipped",
  cannot_perform: "Can't perform",
  aborted: "Stopped",
};

export default async function SessionPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isSessionKind(kind)) notFound();

  const user = await requireUser();
  const view = await getSessionView(user.id, kind);
  const availability = sessionAvailability(view.state, kind);

  if (!view.session) {
    if (availability !== "available") redirect("/spawn");
    return (
      <>
        <FlowHeader backHref="/spawn" context={`Spawn ${SESSION_CATALOG[kind].number}`} exitHref="/today" />
        <Preflight kind={kind} />
      </>
    );
  }

  if (view.session.status === "completed") {
    const all = await getAllSpawnResults(user.id);
    return <SessionComplete kind={kind} view={view} completed={completedTestKeys(toResultSummaries(all))} />;
  }
  return <SessionOverview kind={kind} view={view} />;
}

function SessionOverview({ kind, view }: { kind: SessionKind; view: SessionView }) {
  const session = view.session!;
  const summaries = toResultSummaries(view.results);
  const tests = testsForSession(kind);
  const next = nextTest(kind, summaries);
  const done = isSessionComplete(kind, summaries);
  const resolvedCount = tests.filter((t) => !["not_started", "in_progress"].includes(testProgress(t, summaries))).length;

  return (
    <>
      <FlowHeader
        backHref="/spawn"
        context={`Spawn ${SESSION_CATALOG[kind].number} · ${SESSION_CATALOG[kind].title}`}
        progress={{ value: resolvedCount, max: tests.length, label: "Session progress", text: `${resolvedCount} of ${tests.length}` }}
      />
      <main id="main" className={styles.page}>
        <header className={styles.hero}>
          <p className="text-label text-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <PixelIcon name={SESSION_RUNE[kind]} size={16} /> Spawn {SESSION_CATALOG[kind].number}
          </p>
          <h1 className="text-h1">{SESSION_CATALOG[kind].title}</h1>
          <p className="text-muted">
            {done
              ? "Every test has a result or a reason. Retry anything you skipped, or finish the session."
              : "Tests run in order. Skipped tests can be retried before you finish."}
          </p>
        </header>

        <ol className={styles.tests} aria-label="Tests">
          {tests.map((test) => {
            const progress = testProgress(test, summaries);
            return (
              <li key={test.key}>
                <Link href={testPath(kind, test.key)} className={styles.testLink}>
                  <span className={styles.testKey}>{test.key}</span>
                  <span className={styles.testName}>{test.name}</span>
                  <span
                    className={`${styles.testState} ${progress === "completed" ? styles.testDone : ""} ${
                      progress === "in_progress" ? styles.testOpen : ""
                    }`}
                  >
                    {progress === "completed" ? <Icon name="check" size={16} /> : null}
                    {PROGRESS_TEXT[progress]}
                    <Icon name="chevron-right" size={18} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <MobileActionBar>
          {done ? (
            <ActionButton action={completeSession.bind(null, session.id)}>
              Finish {SESSION_CATALOG[kind].title}
            </ActionButton>
          ) : next ? (
            <ButtonLink href={testPath(kind, next.key)}>
              {resolvedCount === 0 ? `Start with ${next.name}` : `Continue: ${next.name}`}
            </ButtonLink>
          ) : null}
        </MobileActionBar>
      </main>
    </>
  );
}

function flagCount(results: ResultRow[]): number {
  return results.filter((r) => r.pain_reported || r.reason_code === "pain").length;
}

/** "MOVEMENT COMPLETE" — data collected, not scores (brief §7, ADR-018). */
function SessionComplete({
  kind,
  view,
  completed,
}: {
  kind: SessionKind;
  view: SessionView;
  /** Completed tests across all Spawn sessions so far. */
  completed: ReadonlySet<string>;
}) {
  const coverage = attributesForSession(kind).map((attribute) => attributeCoverage(attribute, completed));
  const index = SESSION_KINDS.indexOf(kind);
  const nextKind = SESSION_KINDS[index + 1];
  const flags = flagCount(view.results);
  const skipped = view.results.filter((r) => r.status !== "completed" && r.status !== "in_progress").length;

  return (
    <>
      <FlowHeader backHref="/spawn" context={`Spawn ${SESSION_CATALOG[kind].number}`} />
      <main id="main" className={styles.page}>
        <header className={styles.hero}>
          <p className="text-label text-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <PixelIcon name={SESSION_RUNE[kind]} size={16} /> Spawn {SESSION_CATALOG[kind].number}
          </p>
          <h1 className="text-display">{SESSION_CATALOG[kind].title} complete</h1>
          <p className={styles.lede}>Raw results are stored exactly as you recorded them. No Stats are calculated yet.</p>
        </header>

        <AttributeLadder
          label="Data collected"
          overall={{ key: "overall", label: "Overall", status: "Unranked", tone: "muted" }}
          rows={coverage.map((c) => ({
            key: c.attribute,
            label: ATTRIBUTE_LABELS[c.attribute],
            status: COVERAGE_TEXT[c.status],
            tone: TONE[c.status],
          }))}
        />

        {flags > 0 || skipped > 0 ? (
          <p className={styles.flags}>
            <Icon name="flag" size={20} />
            <span>
              {flags > 0 ? `${flags} Movement ${flags === 1 ? "Flag" : "Flags"} recorded. ` : ""}
              {skipped > 0 ? `${skipped} ${skipped === 1 ? "test" : "tests"} without a result — nothing is assumed about ${skipped === 1 ? "it" : "them"}.` : ""}
            </span>
          </p>
        ) : null}

        {nextKind ? (
          <section className={styles.next} aria-label="Next session">
            <p className="text-label text-gold">Next</p>
            <p className={styles.nextTitle}>{SESSION_CATALOG[nextKind].title}</p>
            <p className="text-muted">
              {SESSION_CATALOG[nextKind].estimate}. Start now or on another day — you&apos;ll come back here.
            </p>
          </section>
        ) : null}

        <MobileActionBar>
          {nextKind ? (
            <>
              <ButtonLink href={sessionPath(nextKind)}>Continue to {SESSION_CATALOG[nextKind].title}</ButtonLink>
              <ButtonLink href="/spawn" variant="secondary">
                Later
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={SPAWN_COMPLETE_PATH}>Continue</ButtonLink>
          )}
        </MobileActionBar>
      </main>
    </>
  );
}
