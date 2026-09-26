import { ATTRIBUTE_KEYS, statTrend, type AttributeKey, type Trend } from "@ascend/shared";
import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/States";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getLatestStats } from "@/features/stats/data";
import { getStatHistories } from "@/features/stats/history";
import { StatList } from "@/features/stats/StatList";
import styles from "@/features/stats/stats.module.css";

export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const user = await requireInitializedAthlete();
  const now = new Date();
  const [stats, histories] = await Promise.all([getLatestStats(user.id), getStatHistories(user.id, now)]);
  const trends = Object.fromEntries(
    ATTRIBUTE_KEYS.map((key) => [key, statTrend(histories[key] ?? [], "28d", now)]),
  ) as Record<AttributeKey, Trend>;

  return (
    <>
      <ScreenHeader title="Stats" />
      {stats ? (
        <div className="stack stack--lg">
          <StatList stats={stats} trends={trends} />
          <p className={styles.note}>
            Tap a Stat to see its history and why it is what it is. Engine {stats.engineVersion} ·{" "}
            {stats.calibrationStatus} calibration — ASCEND&apos;s own scale, not a percentile.
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
