import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  attributeCoverage,
  completedTestKeys,
  hasReached,
  toResultSummaries,
  type CoverageStatus,
} from "@ascend/shared";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlowHeader } from "@/components/shell/FlowHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { AttributeLadder } from "@/features/spawn/components/AttributeLadder";
import { DevTools } from "@/features/spawn/components/DevTools";
import styles from "@/features/spawn/components/spawn.module.css";
import { getAllSpawnResults, getSpawnSnapshot, sessionPointers } from "@/features/spawn/data";
import { resolveSpawnPath } from "@/features/spawn/routing";
import { getLatestStats } from "@/features/stats/data";
import { InitializeFlow } from "@/features/stats/InitializeFlow";
import { StatList } from "@/features/stats/StatList";
import statStyles from "@/features/stats/stats.module.css";
import { requireUser } from "@/lib/auth";
import { devToolsEnabled } from "@/lib/dev";

export const metadata: Metadata = { title: "Spawn complete" };

const COVERAGE_TEXT: Record<CoverageStatus, string> = {
  collected: "Data collected",
  partial: "Partial data",
  not_assessed: "Not assessed in Spawn",
};

const TONE = { collected: "collected", partial: "partial", not_assessed: "muted" } as const;

/**
 * SPAWN COMPLETE → INITIALIZE → ATHLETE PROFILE INITIALIZED (spec §60,
 * Milestone 3 brief §11, §13).
 */
export default async function SpawnCompletePage() {
  const user = await requireUser();
  const { state, settings, sessions } = await getSpawnSnapshot(user.id);
  if (!hasReached(state, "ENGINE_COMPLETE")) {
    redirect(resolveSpawnPath(state, settings.onboarding_step, sessionPointers(sessions)));
  }

  if (state === "COMPLETE") {
    const stats = await getLatestStats(user.id);
    if (stats) {
      return (
        <>
          <FlowHeader context="Athlete profile" exitHref="/today" />
          <main id="main" className={styles.page}>
            <header className={styles.hero}>
              <p className="text-label text-muted">Athlete profile</p>
              <h1 className="text-display">Initialized.</h1>
              <p className={styles.lede}>
                Your first estimate of what you can actually do. Confidence is still building — ASCEND will refine
                these as you train.
              </p>
            </header>
            <StatList stats={stats} />
            <p className={statStyles.note}>
              ASCEND Engine {stats.engineVersion} · {stats.calibrationStatus} calibration. Scores use ASCEND&apos;s own
              scale; they are not percentiles or population rankings.
            </p>
            {devToolsEnabled() ? <DevTools /> : null}
            <MobileActionBar>
              <ButtonLink href="/ascend/paths">Choose your paths</ButtonLink>
            </MobileActionBar>
          </main>
        </>
      );
    }
  }

  const completed = completedTestKeys(toResultSummaries(await getAllSpawnResults(user.id)));
  const calibrating = state === "CALIBRATING";

  return (
    <>
      <FlowHeader context="Spawn" />
      <main id="main" className={styles.page}>
        <InitializeFlow retry={calibrating}>
          <header className={styles.hero}>
            <p className="text-label text-muted">Spawn complete</p>
            <h1 className="text-display">Athlete data collected.</h1>
            <p className={styles.lede}>
              {calibrating
                ? "Calibration hasn't finished yet. Your raw results are stored; nothing is estimated until it does."
                : "ASCEND now has enough information to initialize your athlete profile."}
            </p>
          </header>

          <AttributeLadder
            label="Data collected"
            overall={{ key: "overall", label: "Overall", status: "Unranked", tone: "muted" }}
            rows={ATTRIBUTE_KEYS.map((attribute) => {
              const coverage = attributeCoverage(attribute, completed);
              return {
                key: attribute,
                label: ATTRIBUTE_LABELS[attribute],
                status: COVERAGE_TEXT[coverage.status],
                tone: TONE[coverage.status],
              };
            })}
          />

          <p className="text-muted">Power has no Spawn test by design. It builds from safe training evidence instead.</p>
          {devToolsEnabled() ? <DevTools /> : null}
        </InitializeFlow>
      </main>
    </>
  );
}
