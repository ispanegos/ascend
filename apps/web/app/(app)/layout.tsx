import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import { requireUser } from "@/lib/auth";

/** Authenticated app shell: page content + bottom navigation (spec §25). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <>
      <ConnectionStatus />
      <main id="main" className="app-page">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
