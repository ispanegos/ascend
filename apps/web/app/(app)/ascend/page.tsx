import type { Metadata } from "next";
import { AscendScreen, type PathNode } from "@/features/screens/AscendScreen";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Ascend" };

/*
 * Only the first three nodes reflect real state today: Spawn and
 * initialization are done, Path choice is next. The rest are the product's
 * known stages, shown dormant — no invented progress.
 */
const NODES: readonly PathNode[] = [
  { label: "Spawn", detail: "Completed", state: "completed", icon: "check" },
  { label: "Athlete profile", detail: "Initialized", state: "completed", icon: "check" },
  { label: "Choose your Paths", detail: "You are here", state: "current", icon: "ascend", href: "/ascend/paths" },
  { label: "First Quests", detail: "Opens with your Paths", state: "future", icon: "quest" },
  { label: "Verification", detail: "A later, independent result", state: "future", icon: "verified" },
  { label: "Boss", detail: "Undiscovered", state: "boss", icon: "boss", href: "/bosses" },
];

export default async function AscendPage() {
  await requireInitializedAthlete();
  return (
    <AscendScreen
      nodes={NODES}
      objective={{
        title: "Choose your Paths",
        text: "Pick the attributes to prioritise. The route beyond opens from there.",
        href: "/ascend/paths",
        cta: "Choose your paths",
      }}
    />
  );
}
