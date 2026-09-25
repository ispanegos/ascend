import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Stats" };

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Stats" />
      <EmptyState title="Overall — unranked">
        <p>
          Stats are estimates of what you can actually do. They appear once Spawn has measured
          you. Unknown is not zero.
        </p>
      </EmptyState>
    </>
  );
}
