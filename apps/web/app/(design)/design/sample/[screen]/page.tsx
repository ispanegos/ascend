import { ATTRIBUTE_KEYS } from "@ascend/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/shell/BottomNav";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { AscendScreen } from "@/features/screens/AscendScreen";
import { BossScreen } from "@/features/screens/BossScreen";
import { QuestsScreen } from "@/features/screens/QuestsScreen";
import { SAMPLE_ATHLETE, SAMPLE_BOSS, SAMPLE_QUESTS, SAMPLE_STATS } from "@/features/screens/samples";
import { TodayScreen } from "@/features/screens/TodayScreen";
import { WorkoutScreen } from "@/features/screens/WorkoutScreen";
import { StatList } from "@/features/stats/StatList";

const SCREENS = ["today", "quests", "ascend", "stats", "boss", "workout"] as const;
type Screen = (typeof SCREENS)[number];

const NAV: Record<Screen, string | null> = {
  today: "/today",
  quests: "/quests",
  ascend: "/ascend",
  stats: "/stats",
  boss: "/ascend",
  workout: null,
};

export async function generateMetadata({ params }: { params: Promise<{ screen: string }> }): Promise<Metadata> {
  const { screen } = await params;
  return { title: `Sample ${screen} · Design System V2` };
}

const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, SAMPLE_STATS[key]])) as Record<
  (typeof ATTRIBUTE_KEYS)[number],
  (typeof SAMPLE_STATS)["overall"]
>;

/**
 * A full phone screen with SAMPLE content (features/screens/samples.ts), for
 * visual review only. Same components as the product routes; no logic.
 */
export default async function SampleScreen({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!(SCREENS as readonly string[]).includes(screen)) notFound();
  const kind = screen as Screen;
  const nav = NAV[kind];

  let body;
  switch (kind) {
    case "today":
      body = (
        <TodayScreen
          name={SAMPLE_ATHLETE.name}
          dayLabel="Saturday, 26 Sep"
          overall={SAMPLE_STATS.overall}
          attributes={attributes}
          primary={{ kind: "quest", quest: SAMPLE_QUESTS[0]! }}
          next={{ title: "Verify Endurance", text: "A reassessment on a later day can verify it." }}
        />
      );
      break;
    case "quests":
      body = <QuestsScreen quests={SAMPLE_QUESTS} />;
      break;
    case "ascend":
      body = (
        <AscendScreen
          nodes={[
            { label: "Spawn", detail: "Completed", state: "completed", icon: "check" },
            { label: "Foundation", detail: "Strength · Core", state: "completed", icon: "check" },
            { label: "Endurance gate", detail: "3 of 5 Quests", state: "current", icon: "endurance" },
            { label: "Verification", detail: "Reassessment", state: "future", icon: "verified" },
            { label: "Resilience", detail: "Recovery · Core", state: "future", icon: "quest" },
            { label: "The Warden", detail: "Boss", state: "boss", icon: "boss", href: "/design/sample/boss" },
          ]}
          objective={{ title: "Endurance gate", text: "Two Quests left before the next verification.", href: "/design/sample/quests", cta: "View Quests" }}
        />
      );
      break;
    case "stats":
      body = (
        <>
          <ScreenHeader title="Stats" />
          <StatList stats={{ overall: SAMPLE_STATS.overall, stats: attributes }} />
        </>
      );
      break;
    case "boss":
      body = (
        <BossScreen
          heading="Boss"
          name={SAMPLE_BOSS.name}
          meaning={SAMPLE_BOSS.meaning}
          state="available"
          readiness={SAMPLE_BOSS.readiness}
          requirements={SAMPLE_BOSS.requirements}
          action={<Button variant="boss">Face the Boss</Button>}
        />
      );
      break;
    case "workout":
      body = (
        <WorkoutScreen
          exercise="Kettlebell swing"
          prescription="3 sets · 20 reps · 16 kg"
          seconds={32}
          progress={0.6}
          caption="Rep 12 / 20"
          set="2 / 3"
          rest="60"
          heartRate="128"
          cue="Hinge at the hips. Back flat, core braced."
          overall={{ done: 11, total: 20 }}
        />
      );
      break;
  }

  return (
    <>
      <main id="main" className={nav ? "app-page" : "app-page app-page--focused"}>
        {body}
      </main>
      {nav ? <BottomNav active={nav} /> : null}
    </>
  );
}
