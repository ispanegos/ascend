import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/States";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Choose your paths" };

/**
 * Route reserved for Path selection (spec §18). The selection itself is
 * Milestone 4; Milestone 3 only provides the destination after initialization.
 */
export default async function ChoosePathsPage() {
  await requireInitializedAthlete();
  return (
    <>
      <ScreenHeader eyebrow="Current objective" title="Choose your paths" />
      <EmptyState
        art="states.sealed-gate"
        title="Path selection opens in the next release"
        action={
          <ButtonLink href="/stats" variant="secondary" fit="auto">
            Review your Stats
          </ButtonLink>
        }
      >
        <p>
          Paths are the attributes you choose to prioritise. Your initialized Stats are what ASCEND will use to
          suggest them.
        </p>
      </EmptyState>
    </>
  );
}
