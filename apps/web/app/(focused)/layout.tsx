import type { ReactNode } from "react";
import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import { requireUser } from "@/lib/auth";

/**
 * Focused flows — Spawn and profile edits. The normal shell and bottom nav are
 * replaced by a flow header (spec §25: "During Spawn, replace normal app shell
 * with a focused assessment flow"). Pages render their own header + <main>.
 */
export default async function FocusedLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <>
      <ConnectionStatus />
      <div className="app-page app-page--focused app-page--flow">{children}</div>
    </>
  );
}
