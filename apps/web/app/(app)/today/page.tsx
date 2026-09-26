import type { Metadata } from "next";
import { LocalDayHeading } from "@/components/ui/LocalDate";
import { getCurrentPaths } from "@/features/paths/data";
import { TodayScreen, type TodayScreenProps } from "@/features/screens/TodayScreen";
import { requireInitializedAthlete } from "@/features/spawn/guard";
import { getLatestStats } from "@/features/stats/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Today" };

/** Today (spec §61, V2 §15) — foundation only; real athlete data. */
export default async function TodayPage() {
  const user = await requireInitializedAthlete();
  const supabase = await createClient();
  const [stats, profile, paths] = await Promise.all([
    getLatestStats(user.id),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    getCurrentPaths(user.id),
  ]);
  const line = (key: NonNullable<typeof paths.primary>) => {
    const stat = stats!.stats[key];
    return { attribute: key, current: stat.current, confidence: stat.confidence, status: stat.status };
  };
  const primary: TodayScreenProps["primary"] =
    paths.primary && stats
      ? { kind: "paths", primary: line(paths.primary), secondary: paths.secondary.map(line) }
      : {
          kind: "objective",
          title: "Choose your Paths",
          text: "Pick the attributes to prioritise. Your Quests are built from them.",
          href: "/ascend/paths",
          cta: "Choose your paths",
        };

  return (
    <TodayScreen
      name={profile.data?.display_name ?? null}
      dayLabel={<LocalDayHeading />}
      overall={stats?.overall ?? null}
      attributes={stats?.stats ?? null}
      primary={primary}
      next={{
        title: "Verify your Stats",
        text: "After Spawn every Stat is provisional. A reassessment, a verified workout or a Boss on a later day can verify it.",
      }}
    />
  );
}
