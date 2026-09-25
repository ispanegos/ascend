"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { safely } from "@/lib/safe-action";
import styles from "./spawn.module.css";

type Action = () => Promise<{ ok: boolean; error?: string; redirectTo?: string }>;

/** Button that runs a server action and follows its redirect. */
export function ActionButton({
  action,
  children,
  variant = "primary",
  confirmText,
}: {
  action: Action;
  children: ReactNode;
  variant?: ButtonVariant;
  /** Asks before running (for destructive development actions). */
  confirmText?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await safely(action);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      router.push(result.redirectTo ?? "/");
      router.refresh();
    });
  }

  return (
    <>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <Button variant={variant} onClick={run} loading={pending}>
        {children}
      </Button>
    </>
  );
}
