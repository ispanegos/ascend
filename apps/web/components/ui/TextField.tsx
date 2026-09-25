"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./TextField.module.css";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "size"> {
  /** Always visible (spec §26). */
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** Unit suffix such as "kg" or "cm", shown inside the field. */
  unit?: string | undefined;
}

export function TextField({ label, hint, error, unit, className, ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={cx(styles.control, error && styles.invalid)}>
        <input
          id={id}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {unit ? (
          <span className={styles.unit} aria-hidden="true">
            {unit}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </div>
  );
}
