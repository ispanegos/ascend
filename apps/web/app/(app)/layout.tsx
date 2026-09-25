import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/shell/BottomNav";
import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import { Icon } from "@/components/ui/Icon";
import { isAthleteInitialized } from "@/features/spawn/guard";
import { requireUser } from "@/lib/auth";

/**
 * Authenticated app shell (spec §25). Until Spawn and calibration are
 * complete only Profile is reachable here, so the bottom navigation is
 * replaced by a way back into Spawn (ADR-023 §9).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const unlocked = await isAthleteInitialized(user.id);

  return (
    <>
      <ConnectionStatus />
      {unlocked ? null : (
        <nav className="locked-shell" aria-label="Spawn">
          <Link href="/" className="locked-shell__link">
            <Icon name="chevron-left" size={20} />
            Back to Spawn
          </Link>
        </nav>
      )}
      <main id="main" className={unlocked ? "app-page" : "app-page app-page--locked"}>
        {children}
      </main>
      {unlocked ? <BottomNav /> : null}
    </>
  );
}
