"use client";

import {
  PAIN_LOCATIONS,
  RESOLUTION_REASONS,
  RESOLUTION_REASON_LABELS,
  statusForReason,
  type ResolutionReason,
} from "@ascend/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { Sheet } from "@/components/ui/Sheet";
import { TextArea } from "@/components/ui/TextArea";
import { resolveTest } from "../actions";
import { safely } from "@/lib/safe-action";
import styles from "./TestFlow.module.css";

interface ResolveSheetProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  testKey: string;
  /** True once the test has started: ending it is a stop, not a skip. */
  started: boolean;
}

/**
 * "I can't do this test" / "Stop test" (spec §53). The reason is always kept;
 * a stopped or skipped test is never treated as zero capability.
 */
export function ResolveSheet({ open, onClose, sessionId, testKey, started }: ResolveSheetProps) {
  const router = useRouter();
  const [reason, setReason] = useState<ResolutionReason | "">("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const status = reason ? statusForReason(reason, started) : null;
  const action = started ? "Stop test" : status === "cannot_perform" ? "Mark as can't perform" : "Skip for now";

  function submit() {
    if (!reason) {
      setErrors({ reason: "Choose a reason." });
      return;
    }
    if (reason === "other" && note.trim() === "") {
      setErrors({ note: "Say what happened." });
      return;
    }
    startTransition(async () => {
      const done = await safely(() => resolveTest({ sessionId, testKey, reason, note, painLocation: location }));
      if (!done.ok) {
        setErrors(done.fieldErrors ?? {});
        setFormError(done.error);
        return;
      }
      onClose();
      router.push(done.redirectTo ?? "/");
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={started ? "Stop this test?" : "Can't do this test?"}>
      <p className="text-muted">
        {started
          ? "Attempts you've saved are kept. Nothing is scored as zero."
          : "That's fine. The reason is recorded and nothing is assumed about your ability."}
      </p>
      <ChipGroup
        legend="Reason"
        layout="stack"
        options={RESOLUTION_REASONS.map((value) => ({ value, label: RESOLUTION_REASON_LABELS[value] }))}
        value={reason ? [reason] : []}
        onChange={(next) => {
          setReason((next[0] as ResolutionReason | undefined) ?? "");
          setErrors({});
        }}
        error={errors.reason}
      />
      {reason === "pain" ? (
        <>
          <p className={styles.flagNote}>This creates a Movement Flag. Stop if anything feels wrong.</p>
          <ChipGroup
            legend="Where? (optional)"
            options={PAIN_LOCATIONS}
            value={location ? [location] : []}
            onChange={(next) => setLocation(next[0] ?? "")}
          />
        </>
      ) : null}
      <TextArea
        label={reason === "other" ? "What happened?" : "Note (optional)"}
        value={note}
        maxLength={500}
        onChange={(event) => {
          setNote(event.target.value);
          setErrors((current) => ({ ...current, note: "" }));
        }}
        error={errors.note || undefined}
      />
      {formError ? (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      ) : null}
      <Button variant={started ? "danger" : "primary"} onClick={submit} loading={pending}>
        {action}
      </Button>
      <Button variant="ghost" onClick={onClose}>
        {started ? "Keep going" : "Back to the test"}
      </Button>
    </Sheet>
  );
}
