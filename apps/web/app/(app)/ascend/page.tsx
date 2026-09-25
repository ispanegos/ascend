import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Ascend" };

export default function AscendPage() {
  return (
    <>
      <PageHeader title="Ascend" />
      <EmptyState title="No active Paths">
        <p>
          Paths are the attributes you choose to prioritise. You choose them after Spawn,
          once ASCEND knows where you are starting from.
        </p>
      </EmptyState>
    </>
  );
}
