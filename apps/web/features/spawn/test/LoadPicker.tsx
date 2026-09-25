"use client";

import { decodeLoad, encodeLoad, formatNumber, parseDecimal, type LoadFieldSpec } from "@ascend/shared";
import Link from "next/link";
import { useState } from "react";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { TextField } from "@/components/ui/TextField";
import type { AvailableLoad } from "../data";
import styles from "./TestFlow.module.css";

interface LoadPickerProps {
  field: LoadFieldSpec;
  value: string;
  onChange: (raw: string) => void;
  loads: readonly AvailableLoad[];
  error?: string | undefined;
}

/**
 * Picks the load actually used, from the athlete's own equipment (spec §13).
 * Records what was held (implements × weight); the total is shown, never
 * silently substituted.
 */
export function LoadPicker({ field, value, onChange, loads, error }: LoadPickerProps) {
  const decoded = decodeLoad(value);
  // Kept locally so the count survives before a weight is chosen.
  const [chosenCount, setChosenCount] = useState<1 | 2>(decoded?.implementCount ?? field.defaultImplements ?? 1);
  const count: 1 | 2 = decoded?.implementCount ?? chosenCount;
  const kg = decoded?.implementKg ?? "";
  const known = new Set(loads.flatMap((group) => group.loadsKg.map((load) => String(load))));
  const parsedKg = parseDecimal(kg, { min: 0.5, max: 250, decimals: 2 });
  const total = parsedKg.ok && parsedKg.value !== null ? parsedKg.value * count : null;

  return (
    <fieldset className={styles.loadPicker} aria-invalid={error ? true : undefined}>
      <legend className={styles.fieldLegend}>{field.label}</legend>

      {field.implementCount === "choose" ? (
        <ChipGroup
          legend="Weights held"
          layout="grid"
          options={[
            { value: "1", label: "One" },
            { value: "2", label: "Two" },
          ]}
          value={[String(count)]}
          onChange={(next) => {
            const nextCount = next[0] === "2" ? 2 : 1;
            setChosenCount(nextCount);
            onChange(encodeLoad(nextCount, kg));
          }}
        />
      ) : null}

      {loads.length > 0 ? (
        loads.map((group) => (
          <ChipGroup
            key={group.equipmentKey}
            legend={group.name}
            options={group.loadsKg.map((load) => ({ value: String(load), label: `${formatNumber(load, 2)} kg` }))}
            value={known.has(kg) ? [kg] : []}
            onChange={(next) => onChange(encodeLoad(count, next[0] ?? ""))}
          />
        ))
      ) : (
        <p className="text-muted">
          No weights in your equipment list yet. Enter the weight below, or{" "}
          <Link href="/profile/edit/loads">add your weights</Link>.
        </p>
      )}

      <TextField
        label={count === 2 ? "Other weight (each)" : "Other weight"}
        inputMode="decimal"
        autoComplete="off"
        unit="kg"
        value={known.has(kg) ? "" : kg}
        onChange={(event) => onChange(encodeLoad(count, event.target.value))}
        error={error}
      />

      {total !== null ? (
        <p className={styles.loadTotal}>
          <span className="text-label text-muted">Total load</span>
          <span className="stat-number">
            {count === 2 ? `2 × ${formatNumber(total / 2, 2)} = ` : ""}
            {formatNumber(total, 2)} kg
          </span>
        </p>
      ) : null}
    </fieldset>
  );
}
