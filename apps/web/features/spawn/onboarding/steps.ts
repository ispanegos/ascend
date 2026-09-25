/**
 * Spawn 0 — Body / Context (spec §9, §11). One concept per screen (spec §26).
 * `welcome` and `review` bracket the steps and are not counted in progress.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "name",
  "birth",
  "sex",
  "height",
  "weight",
  "body-fat",
  "measurements",
  "experience",
  "activity",
  "equipment",
  "loads",
  "environments",
  "availability",
  "schedule",
  "sources",
  "limitations",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Steps that can be edited from Profile after onboarding. */
export type EditableStep = Exclude<OnboardingStep, "welcome" | "review">;

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

export function isEditableStep(value: unknown): value is EditableStep {
  return isOnboardingStep(value) && value !== "welcome" && value !== "review";
}

/** Counted steps: everything between welcome and review. */
const COUNTED = ONBOARDING_STEPS.slice(1, -1);

export function stepPosition(step: OnboardingStep): { index: number; total: number } | null {
  const index = (COUNTED as readonly string[]).indexOf(step);
  return index === -1 ? null : { index: index + 1, total: COUNTED.length };
}

/**
 * The step after `step`. `loads` only applies when the athlete owns loadable
 * equipment.
 */
export function nextStep(step: OnboardingStep, hasLoadableEquipment: boolean): OnboardingStep {
  const index = ONBOARDING_STEPS.indexOf(step);
  const next = ONBOARDING_STEPS[Math.min(index + 1, ONBOARDING_STEPS.length - 1)] ?? "review";
  if (next === "loads" && !hasLoadableEquipment) return nextStep("loads", hasLoadableEquipment);
  return next;
}

export function previousStep(step: OnboardingStep, hasLoadableEquipment: boolean): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index <= 0) return null;
  const previous = ONBOARDING_STEPS[index - 1] ?? null;
  if (previous === "loads" && !hasLoadableEquipment) return previousStep("loads", hasLoadableEquipment);
  return previous;
}
