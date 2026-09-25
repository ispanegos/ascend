import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Bosses" };

export default function BossesPage() {
  return (
    <>
      <PageHeader title="Bosses" />
      <EmptyState title="No Bosses available yet">
        <p>
          Bosses are standardised challenges that prove what you are capable of. The Boss
          library opens in a later release.
        </p>
      </EmptyState>
    </>
  );
}
