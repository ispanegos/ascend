import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSerializableContext } from "@/features/spawn/data";
import { StepForm } from "@/features/spawn/onboarding/StepForm";
import { isEditableStep } from "@/features/spawn/onboarding/steps";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Edit profile" };

/** Edit one profile item with the same screen used in onboarding (spec §25 Profile). */
export default async function EditProfileStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!isEditableStep(step)) notFound();

  const user = await requireUser();
  const context = await getSerializableContext(user.id);
  return <StepForm step={step} mode="edit" context={context} backHref="/profile" />;
}
