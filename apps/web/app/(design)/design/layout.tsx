import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { designGalleryEnabled } from "@/lib/dev";

/** Design System V2 gallery — visual review only, never product functionality. */
export default async function DesignLayout({ children }: { children: ReactNode }) {
  await connection();
  if (!designGalleryEnabled()) notFound();
  return (
    <div className="app-page app-page--focused">
      <main id="main" className="stack stack--lg" style={{ paddingBlock: "var(--space-4) var(--space-10)" }}>
        {children}
      </main>
    </div>
  );
}
