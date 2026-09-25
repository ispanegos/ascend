"use client";

import { useId, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./TextField.module.css";

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

/** Multi-line companion to TextField, sharing its styles (spec §26 forms). */
export function TextArea({ label, hint, error, className, ...rest }: TextAreaProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
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
        <textarea
          id={id}
          className={cx(styles.input, styles.textarea)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          {...rest}
        />
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </div>
  );
}
