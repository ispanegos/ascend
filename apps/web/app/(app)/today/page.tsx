import { SESSION_CATALOG, hasReached, nextSession } from "@ascend/shared";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { LocalDayHeading } from "@/components/ui/LocalDate";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSpawnSnapshot } from "@/features/spawn/data";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser();
  const { state } = await getSpawnSnapshot(user.id);
  const next = nextSession(state);

  const spawn = !hasReached(state, "MOVEMENT_PENDING")
    ? { title: "Spawn not finished", body: "Finish your profile so ASCEND can begin measuring.", cta: "Continue Spawn" }
    : !hasReached(state, "ENGINE_COMPLETE")
      ? {
          title: "Spawn in progress",
          body: next
            ? `Next: ${SESSION_CATALOG[next].title}. Sessions can be on different days.`
            : "Continue where you left off.",
          cta: "Continue Spawn",
        }
      : state === "ENGINE_COMPLETE"
        ? { title: "Spawn data collected", body: "Initialise your athlete profile to continue.", cta: "Open Spawn" }
        : state === "CALIBRATING"
          ? { title: "Calibration pending", body: "Your first Quest arrives once your athlete profile is initialised.", cta: null }
          : null;

  return (
    <>
      <PageHeader eyebrow={<LocalDayHeading />} title="Today" />
      {spawn ? (
        <EmptyState title={spawn.title} action={spawn.cta ? <ButtonLink href="/">{spawn.cta}</ButtonLink> : undefined}>
          <p>{spawn.body} Until then there is nothing to train — and nothing is assumed about your ability.</p>
        </EmptyState>
      ) : (
        <EmptyState title="No Quest yet">
          <p>Your first Quest is generated from your Spawn results.</p>
        </EmptyState>
      )}
    </>
  );
}
