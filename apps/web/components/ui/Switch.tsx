"use client";

import { useId } from "react";
import styles from "./Switch.module.css";

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Text shown next to the control; defaults to On/Off so state is not colour-only. */
  stateLabels?: [on: string, off: string];
}

/** On/off toggle with `role="switch"`. The whole row is the 44px target. */
export function Switch({ label, checked, onChange, stateLabels = ["On", "Off"] }: SwitchProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      className={styles.row}
      onClick={() => onChange(!checked)}
    >
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <span className={styles.state} aria-hidden="true">
        {checked ? stateLabels[0] : stateLabels[1]}
      </span>
      <span className={styles.track} data-checked={checked} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
