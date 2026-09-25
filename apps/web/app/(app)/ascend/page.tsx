import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Ascend" };

export default async function AscendPage() {
  await requireInitializedAthlete();
  return (
    <>
      <PageHeader title="Ascend" />
      <EmptyState title="No active Paths">
        <p>
          Paths are the attributes you choose to prioritise. You choose them after Spawn,
          once ASCEND knows where you are starting from.
        </p>
      </EmptyState>
      <div style={{ marginTop: "var(--space-6)" }}>
        <ButtonLink href="/ascend/paths" fit="auto">
          Choose your paths
        </ButtonLink>
      </div>
    </>
  );
}
