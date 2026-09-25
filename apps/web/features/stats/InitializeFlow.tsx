"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { initializeAthleteProfile } from "@/features/spawn/actions";
import { safely } from "@/lib/safe-action";
import styles from "./stats.module.css";

const PIPELINE = [
  "Reading your raw Spawn results",
  "Extracting test features",
  "Scoring subdomains",
  "Aggregating attributes",
  "Calculating Confidence and Overall",
] as const;

/**
 * INITIALIZE ATHLETE PROFILE. While the engine runs, the screen names what it
 * does — no fake progress percentage, no invented timing.
 */
export function InitializeFlow({ retry = false, children }: { retry?: boolean; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await safely(() => initializeAthleteProfile());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo ?? "/spawn/complete");
      router.refresh();
    });
  }

  if (pending) {
    return (
      <div className={styles.initializing} role="status" aria-live="polite">
        <p className="text-label text-muted">ASCEND Engine 0.1</p>
        <p className="text-display">Initializing.</p>
        <ol className={styles.pipeline}>
          {PIPELINE.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <span className={styles.pulse} aria-hidden="true" />
      </div>
    );
  }

  return (
    <>
      {children}
      <MobileActionBar>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <Button onClick={run}>{retry || error ? "Try initializing again" : "Initialize athlete profile"}</Button>
      </MobileActionBar>
    </>
  );
}
