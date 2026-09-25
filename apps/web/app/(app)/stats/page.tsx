import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/States";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getLatestStats } from "@/features/stats/data";
import { StatList } from "@/features/stats/StatList";
import styles from "@/features/stats/stats.module.css";

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const user = await requireInitializedAthlete();
  const stats = await getLatestStats(user.id);

  return (
    <>
      <ScreenHeader title="Stats" />
      {stats ? (
        <div className="stack stack--lg">
          <StatList stats={stats} />
          <p className={styles.note}>
            Tap a Stat to see why it is what it is. Engine {stats.engineVersion} · {stats.calibrationStatus}{" "}
            calibration — ASCEND&apos;s own scale, not a percentile.
          </p>
        </div>
      ) : (
        <EmptyState title="Overall — unranked" icon="unranked">
          <p>Stats appear once your athlete profile is initialized. Unknown is not zero.</p>
        </EmptyState>
      )}
    </>
  );
}
