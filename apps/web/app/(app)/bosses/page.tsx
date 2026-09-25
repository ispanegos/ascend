import type { Metadata } from "next";
import { BossCard } from "@/components/game/BossCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Bosses" };

/**
 * Bosses (V2 §19) — visual foundation only. The Boss library and Readiness
 * engine are later milestones; the one guardian shown is undiscovered.
 */
export default async function BossesPage() {
  await requireInitializedAthlete();
  return (
    <>
      <ScreenHeader
        title="Bosses"
        description="Standardised challenges that prove what you can do. The Boss library opens in a later release."
      />
      <BossCard name="Undiscovered" meaning="" state="undiscovered" readiness={null} requirements={[]} />
    </>
  );
}
