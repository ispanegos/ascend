import type { Metadata } from "next";
import { LocalDayHeading } from "@/components/ui/LocalDate";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <>
      <PageHeader eyebrow={<LocalDayHeading />} title="Today" />
      <EmptyState title="No Quest yet">
        <p>
          Your first Quest is generated after Spawn, the initial assessment. Until then there
          is nothing to train — and nothing is assumed about your ability.
        </p>
      </EmptyState>
    </>
  );
}
