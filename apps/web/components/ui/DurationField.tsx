"use client";

import { splitDuration } from "@ascend/shared";
import { useId, useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./DurationField.module.css";

interface DurationFieldProps {
  label: string;
  /** Raw value: `m:ss(.s)` or plain seconds. Empty = not entered. */
  value: string;
  onChange: (raw: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  /** Pace shows "/km" after the seconds box. */
  pace?: boolean;
}

function toParts(value: string): { minutes: string; seconds: string } {
  if (value === "") return { minutes: "", seconds: "" };
  if (value.includes(":")) {
    const [minutes = "", seconds = ""] = value.split(":");
    return { minutes, seconds };
  }
  const total = Number(value.replace(",", "."));
  return Number.isFinite(total) ? splitDuration(total) : { minutes: "", seconds: value };
}

function fromParts({ minutes, seconds }: { minutes: string; seconds: string }): string {
  if (minutes === "" && seconds === "") return "";
  if (minutes === "") return seconds;
  return `${minutes}:${seconds === "" ? "00" : seconds}`;
}

/**
 * Minutes + seconds entry with numeric keypads (spec §26). iOS number pads
 * have no colon key, so a single "1:05" text box would not work on a phone.
 */
export function DurationField({ label, value, onChange, hint, error, pace = false }: DurationFieldProps) {
  const id = useId();
  const [parts, setParts] = useState(() => toParts(value));
  const [synced, setSynced] = useState(value);

  // Adopt values set from outside (e.g. the timer) without losing typing.
  if (value !== synced) {
    setSynced(value);
    if (value !== fromParts(parts)) setParts(toParts(value));
  }

  function update(next: { minutes: string; seconds: string }) {
    setParts(next);
    const raw = fromParts(next);
    setSynced(raw);
    onChange(raw);
  }

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className={styles.field} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className={styles.label}>{label}</legend>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.row}>
        <label className={cx(styles.box, error && styles.invalid)}>
          <input
            className={styles.input}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="next"
            aria-label={`${label}, minutes`}
            value={parts.minutes}
            onChange={(event) => update({ ...parts, minutes: event.target.value })}
          />
          <span className={styles.unit} aria-hidden="true">
            min
          </span>
        </label>
        <label className={cx(styles.box, error && styles.invalid)}>
          <input
            className={styles.input}
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            aria-label={`${label}, seconds`}
            value={parts.seconds}
            onChange={(event) => update({ ...parts, seconds: event.target.value })}
          />
          <span className={styles.unit} aria-hidden="true">
            {pace ? "s /km" : "s"}
          </span>
        </label>
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </fieldset>
  );
}
