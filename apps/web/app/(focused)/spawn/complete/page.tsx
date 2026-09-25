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
import { requestCalibration } from "@/features/spawn/actions";
import { ActionButton } from "@/features/spawn/components/ActionButton";
import { AttributeLadder } from "@/features/spawn/components/AttributeLadder";
import { DevTools } from "@/features/spawn/components/DevTools";
import styles from "@/features/spawn/components/spawn.module.css";
import { getAllSpawnResults, getSpawnSnapshot, sessionPointers } from "@/features/spawn/data";
import { resolveSpawnPath } from "@/features/spawn/routing";
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
 * SPAWN COMPLETE (spec §60, brief §8). Milestone 2 shows that the raw data
 * set is complete — no Stats. "Initialize athlete profile" is a temporary
 * hand-off that Milestone 3 connects to the Stats Engine.
 */
export default async function SpawnCompletePage() {
  const user = await requireUser();
  const { state, settings, sessions } = await getSpawnSnapshot(user.id);
  if (!hasReached(state, "ENGINE_COMPLETE")) {
    redirect(resolveSpawnPath(state, settings.onboarding_step, sessionPointers(sessions)));
  }

  const completed = completedTestKeys(toResultSummaries(await getAllSpawnResults(user.id)));
  const calibrating = hasReached(state, "CALIBRATING");

  return (
    <>
      <FlowHeader context="Spawn" />
      <main id="main" className={styles.page}>
        <header className={styles.hero}>
          <p className="text-label text-muted">Spawn complete</p>
          <h1 className="text-display">{calibrating ? "Calibration pending." : "Athlete data collected."}</h1>
          <p className={styles.lede}>
            {calibrating
              ? "Your raw results are stored. The ASCEND Stats Engine will initialise your profile from them — nothing is estimated before then."
              : "ASCEND now has enough information to initialise your athlete profile."}
          </p>
        </header>

        <AttributeLadder
          label="Data collected"
          overall={{
            key: "overall",
            label: "Overall",
            status: calibrating ? "Awaiting calibration" : "Unranked",
            tone: "muted",
          }}
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

        <p className="text-muted">
          Power has no Spawn test by design. It builds from safe training evidence instead.
        </p>

        {devToolsEnabled() ? <DevTools /> : null}

        <MobileActionBar>
          {calibrating ? (
            <ButtonLink href="/today">Go to Today</ButtonLink>
          ) : (
            <ActionButton action={requestCalibration}>Initialize athlete profile</ActionButton>
          )}
        </MobileActionBar>
      </main>
    </>
  );
}
