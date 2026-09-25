import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LockedState } from "@/components/ui/States";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Quests" };

/**
 * Quests (V2 §16) — destination only. Quest generation is Milestone 4+;
 * nothing here invents Quests.
 */
export default async function QuestsPage() {
  await requireInitializedAthlete();
  return (
    <>
      <ScreenHeader title="Quests" />
      <div className="stack stack--lg">
        <LockedState
          title="Quests open with your Paths"
          action={
            <ButtonLink href="/ascend/paths" fit="auto">
              Choose your paths
            </ButtonLink>
          }
        >
          <p>ASCEND builds your week of Quests from the Paths you choose and the Stats Spawn measured.</p>
        </LockedState>
        <Card as="section" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className="text-label text-gold" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PixelIcon name="quest" size={16} /> How Quests count
          </h2>
          <p className="text-muted" style={{ marginTop: "var(--space-2)" }}>
            A Quest produces evidence for your real Stats. Finishing one never adds points by itself — what you
            actually do is what moves a Stat.
          </p>
        </Card>
      </div>
    </>
  );
}
