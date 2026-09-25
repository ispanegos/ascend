"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";
import styles from "./RpeScale.module.css";

interface RpeScaleProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
}

const VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;

/** RPE 1–10 as a radio grid of 44px targets (spec §62 "How hard was that?"). */
export function RpeScale({ label, value, onChange, hint, error }: RpeScaleProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <fieldset
      className={styles.field}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className={styles.label}>{label}</legend>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.grid}>
        {VALUES.map((option) => {
          const checked = value === option;
          return (
            <label key={option} className={cx(styles.cell, checked && styles.selected)}>
              <input
                type="radio"
                className={styles.input}
                name={id}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
      <div className={styles.anchors} aria-hidden="true">
        <span>Very easy</span>
        <span>Maximal</span>
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </fieldset>
  );
}
