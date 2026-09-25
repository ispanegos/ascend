import { redirect } from "next/navigation";
import { getSpawnSnapshot } from "@/features/spawn/data";
import { isOnboardingStep } from "@/features/spawn/onboarding/steps";
import { onboardingPath } from "@/features/spawn/routing";
import { requireUser } from "@/lib/auth";

/** /spawn/body → the onboarding step the athlete last reached. */
export default async function BodyIndex() {
  const user = await requireUser();
  const { settings } = await getSpawnSnapshot(user.id);
  redirect(onboardingPath(isOnboardingStep(settings.onboarding_step) ? settings.onboarding_step : "welcome"));
}
