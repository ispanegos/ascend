"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";
import styles from "./ChipGroup.module.css";

export interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  legend: string;
  options: readonly ChipOption[];
  /** Selected values. Single-select groups hold at most one. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Checkbox semantics when true, radio semantics otherwise. */
  multiple?: boolean;
  /** Form field name, so chips submit with native forms. */
  name?: string;
  hint?: string | undefined;
  /** Visually hide the legend when a surrounding heading already names the group. */
  hideLegend?: boolean;
  /**
   * `wrap`: pills that flow (default). `stack`: full-width rows for long
   * labels. `grid`: equal columns, like a segmented control.
   */
  layout?: "wrap" | "stack" | "grid";
  error?: string | undefined;
}

/**
 * Chips replace long select menus (spec §26). Built on native radio/checkbox
 * inputs for keyboard and screen-reader behaviour. Selected state changes
 * border weight, fill and adds a check mark — not colour alone (spec §32).
 */
export function ChipGroup({
  legend,
  options,
  value,
  onChange,
  multiple = false,
  name,
  hint,
  hideLegend = false,
  layout = "wrap",
  error,
}: ChipGroupProps) {
  const autoName = useId();
  const groupName = name ?? autoName;
  const hintId = hint ? `${autoName}-hint` : undefined;
  const errorId = error ? `${autoName}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  function toggle(optionValue: string, checked: boolean) {
    if (multiple) {
      onChange(
        checked
          ? [...value, optionValue]
          : value.filter((selected) => selected !== optionValue),
      );
    } else {
      onChange(checked ? [optionValue] : []);
    }
  }

  return (
    <fieldset className={styles.group} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className={cx(styles.legend, hideLegend && "visually-hidden")}>{legend}</legend>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={cx(styles.chips, layout !== "wrap" && styles[layout])}>
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label key={option.value} className={cx(styles.chip, checked && styles.selected)}>
              <input
                className={styles.input}
                type={multiple ? "checkbox" : "radio"}
                name={groupName}
                value={option.value}
                checked={checked}
                onChange={(event) => toggle(option.value, event.target.checked)}
              />
              {checked ? <Icon name="check" size={16} className={styles.check} /> : null}
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">!</span> {error}
        </p>
      ) : null}
    </fieldset>
  );
}
