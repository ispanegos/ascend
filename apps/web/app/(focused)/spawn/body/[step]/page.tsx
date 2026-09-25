import { hasReached } from "@ascend/shared";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSerializableContext, getSpawnSnapshot } from "@/features/spawn/data";
import { Review } from "@/features/spawn/onboarding/Review";
import { StepForm } from "@/features/spawn/onboarding/StepForm";
import { profileSummary } from "@/features/spawn/onboarding/summary";
import { isOnboardingStep, previousStep } from "@/features/spawn/onboarding/steps";
import { onboardingPath } from "@/features/spawn/routing";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile setup" };

/** Spawn 0 — one onboarding screen (spec §9, §11). */
export default async function OnboardingStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const [{ step }, { return: returnParam }] = await Promise.all([params, searchParams]);
  if (!isOnboardingStep(step)) notFound();

  const user = await requireUser();
  const { state } = await getSpawnSnapshot(user.id);
  // Context is done: edits now happen from Profile.
  if (hasReached(state, "MOVEMENT_PENDING")) redirect("/spawn");
  if (state === "NOT_STARTED" && step !== "welcome") redirect(onboardingPath("welcome"));
  if (state === "BODY_PROFILE" && step === "welcome") redirect("/spawn/body");

  const context = await getSerializableContext(user.id);
  const hasLoadable = context.owned.some(
    (row) => context.catalog.find((item) => item.id === row.equipment_id)?.load_mode !== "none",
  );
  const fromReview = returnParam === "review";
  const previous = previousStep(step, hasLoadable);
  const backHref = fromReview
    ? onboardingPath("review")
    : previous && previous !== "welcome"
      ? onboardingPath(previous)
      : undefined;

  if (step === "review") return <Review rows={profileSummary(context)} backHref={backHref ?? onboardingPath("name")} />;

  return (
    <StepForm
      key={step}
      step={step}
      mode="onboarding"
      context={context}
      backHref={backHref}
      returnTo={fromReview ? onboardingPath("review") : undefined}
    />
  );
}
