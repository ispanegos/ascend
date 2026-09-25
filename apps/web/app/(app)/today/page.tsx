import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { LocalDayHeading } from "@/components/ui/LocalDate";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireInitializedAthlete } from "@/features/spawn/guard";

export const metadata: Metadata = { title: "Today" };

/** Today (spec §61). Reachable only after initialization (ADR-023 §9). */
export default async function TodayPage() {
  await requireInitializedAthlete();
  return (
    <>
      <PageHeader eyebrow={<LocalDayHeading />} title="Today" />
      <EmptyState
        title="No Quest yet"
        action={
          <ButtonLink href="/ascend/paths" fit="auto">
            Choose your paths
          </ButtonLink>
        }
      >
        <p>Your athlete profile is initialized. Quests are generated once you choose your Paths.</p>
      </EmptyState>
    </>
  );
}
