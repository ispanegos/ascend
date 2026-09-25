"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlowHeader } from "@/components/shell/FlowHeader";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { safely } from "@/lib/safe-action";
import { onboardingPath } from "../routing";
import { completeContext } from "./actions";
import type { SummaryRow } from "./summary";
import styles from "./onboarding.module.css";

/** Last onboarding screen: check everything, then open the Spawn Point. */
export function Review({ rows, backHref }: { rows: SummaryRow[]; backHref: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const missing = rows.filter((row) => row.required && !row.value);

  function finish() {
    startTransition(async () => {
      const result = await safely(() => completeContext());
      if (!result.ok) {
        setError(result.error);
        if (result.redirectTo) router.push(result.redirectTo);
        return;
      }
      router.push(result.redirectTo ?? "/spawn");
      router.refresh();
    });
  }

  return (
    <>
      <FlowHeader backHref={backHref} context="Spawn 0 · Review" />
      <main id="main" className={styles.main}>
        <header className={styles.header}>
          <p className="text-label text-muted">Review</p>
          <h1 className="text-h1">Your context</h1>
          <p className={styles.description}>Tap anything to change it. You can also edit all of this later in Profile.</p>
        </header>
        <ul className={styles.review}>
          {rows.map((row) => (
            <li key={row.step}>
              <Link href={`${onboardingPath(row.step)}?return=review`} className={styles.reviewRow}>
                <span>
                  <span className={styles.reviewLabel}>{row.label}</span>
                  <span className={`${styles.reviewValue} ${!row.value && row.required ? styles.missing : ""}`}>
                    {row.value ?? (row.required ? "Required" : "Not provided")}
                  </span>
                </span>
                <Icon name="chevron-right" className={styles.chevron} />
              </Link>
            </li>
          ))}
        </ul>
        <MobileActionBar>
          {error ? (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          ) : null}
          <Button onClick={finish} loading={pending} disabled={missing.length > 0}>
            Continue to Spawn Point
          </Button>
          {missing.length > 0 ? (
            <p className="text-meta text-muted">
              Still needed: {missing.map((row) => row.label.toLowerCase()).join(", ")}.
            </p>
          ) : null}
        </MobileActionBar>
      </main>
    </>
  );
}
