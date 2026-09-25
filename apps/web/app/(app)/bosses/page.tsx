import type { Metadata } from "next";
import { BossScreen } from "@/features/screens/BossScreen";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Bosses" };

/**
 * Bosses — visual foundation only; reached from the Ascend path, not the
 * bottom navigation. The Boss library and Readiness engine are later
 * milestones, so the one guardian shown is undiscovered.
 */
export default async function BossesPage() {
  await requireInitializedAthlete();
  return (
    <BossScreen
      name="Undiscovered"
      meaning=""
      state="undiscovered"
      readiness={null}
      requirements={[]}
      action={<p className="text-muted">Standardised challenges that prove what you can do. The Boss library opens in a later release.</p>}
    />
  );
}
