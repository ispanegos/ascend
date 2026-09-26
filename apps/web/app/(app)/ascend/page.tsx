import { ATTRIBUTE_LABELS } from "@ascend/shared";
import type { Metadata } from "next";
import { getCurrentPaths } from "@/features/paths/data";
import { AscendScreen, type PathNode } from "@/features/screens/AscendScreen";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Ascend" };

/**
 * Ascend (V2 §17, ADR-043): real progression state only. Spawn and
 * initialization are done; Paths are chosen or not; Quests are the next
 * stage and are not simulated; Verification and the Boss are dormant.
 */
export default async function AscendPage() {
  const user = await requireInitializedAthlete();
  const paths = await getCurrentPaths(user.id);
  const chosen = paths.primary !== null;
  const summary = chosen
    ? [
        `Primary: ${ATTRIBUTE_LABELS[paths.primary!]}`,
        ...(paths.secondary.length ? [`Secondary: ${paths.secondary.map((key) => ATTRIBUTE_LABELS[key]).join(", ")}`] : []),
      ].join(" · ")
    : "";

  const nodes: PathNode[] = [
    { label: "Spawn", detail: "Completed", state: "completed", icon: "check" },
    { label: "Athlete profile", detail: "Initialized", state: "completed", icon: "check" },
    chosen
      ? { label: "Paths", detail: `Primary: ${ATTRIBUTE_LABELS[paths.primary!]}`, state: "completed", icon: "check", href: "/ascend/paths" }
      : { label: "Choose your Paths", detail: "You are here", state: "current", icon: "ascend", href: "/ascend/paths" },
    chosen
      ? { label: "Quests", detail: "Next stage · not open yet", state: "current", icon: "quest" }
      : { label: "Quests", detail: "Opens with your Paths", state: "future", icon: "quest" },
    { label: "Verification", detail: "A later, independent result", state: "future", icon: "verified" },
    { label: "Boss", detail: "Undiscovered", state: "boss", icon: "boss", href: "/bosses" },
  ];

  return (
    <AscendScreen
      nodes={nodes}
      objective={
        chosen
          ? {
              title: "Your Paths are set",
              text: `${summary}. Training generation — your Quests — is the next stage of ASCEND.`,
              href: "/ascend/paths",
              cta: "Review your paths",
            }
          : {
              title: "Choose your Paths",
              text: "Pick the attributes to prioritise. The route beyond opens from there.",
              href: "/ascend/paths",
              cta: "Choose your paths",
            }
      }
    />
  );
}
