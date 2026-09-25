import type { Metadata } from "next";
import { BrandMark } from "@/components/shell/BrandMark";
import { ReloadButton } from "./ReloadButton";

export const metadata: Metadata = { title: "Offline" };
// Static so the service worker can precache it.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="app-page app-page--focused">
      <header style={{ paddingBlock: "var(--space-2) var(--space-10)" }}>
        <BrandMark />
      </header>
      <main id="main" className="stack">
        <h1 className="text-h1">You&apos;re offline</h1>
        <p className="text-muted">
          ASCEND needs a connection to load this screen. Anything already saved on this device is
          safe.
        </p>
        <ReloadButton />
      </main>
    </div>
  );
}
