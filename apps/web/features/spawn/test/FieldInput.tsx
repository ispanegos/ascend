"use client";

import type { FieldSpec } from "@ascend/shared";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { DurationField } from "@/components/ui/DurationField";
import { RpeScale } from "@/components/ui/RpeScale";
import { TextField } from "@/components/ui/TextField";
import type { AvailableLoad } from "../data";
import { LoadPicker } from "./LoadPicker";

interface FieldInputProps {
  field: FieldSpec;
  value: string;
  onChange: (raw: string) => void;
  error?: string | undefined;
  loads?: readonly AvailableLoad[];
}

function choiceLayout(field: Extract<FieldSpec, { kind: "choice" }>) {
  const longest = Math.max(...field.options.map((o) => o.label.length));
  if (longest > 16) return "stack" as const;
  // Equal columns only when every label fits without breaking a word.
  return field.options.length <= 3 && longest <= 9 ? ("grid" as const) : ("wrap" as const);
}

/** Renders one catalog field with the right mobile control (spec §26). */
export function FieldInput({ field, value, onChange, error, loads = [] }: FieldInputProps) {
  switch (field.kind) {
    case "choice":
      return (
        <ChipGroup
          legend={field.label}
          hint={field.hint}
          options={field.options}
          layout={choiceLayout(field)}
          value={value ? [value] : []}
          onChange={(next) => onChange(next[0] ?? "")}
          error={error}
        />
      );
    case "rpe":
      return <RpeScale label={field.label} hint={field.hint} value={value} onChange={onChange} error={error} />;
    case "duration":
      return (
        <DurationField
          label={field.label}
          hint={field.hint}
          value={value}
          onChange={onChange}
          error={error}
          pace={field.unit === "s_per_km"}
        />
      );
    case "load":
      return <LoadPicker field={field} value={value} onChange={onChange} loads={loads} error={error} />;
    case "number": {
      const unit = field.unit === "reps" ? undefined : field.unit === "percent" ? "%" : field.unit;
      if (field.signLabels) {
        const negative = value.trim().startsWith("-");
        const magnitude = value.trim().replace(/^-/, "");
        const [negativeLabel, positiveLabel] = field.signLabels;
        return (
          <div className="stack">
            <ChipGroup
              legend={`${field.label}: direction`}
              hideLegend
              layout="grid"
              options={[
                { value: "-", label: negativeLabel },
                { value: "+", label: positiveLabel },
              ]}
              value={[negative ? "-" : "+"]}
              onChange={(next) => onChange(`${next[0] === "-" ? "-" : ""}${magnitude}`)}
            />
            <TextField
              label={field.label}
              hint={field.hint}
              inputMode="decimal"
              autoComplete="off"
              unit={unit}
              value={magnitude}
              onChange={(event) => onChange(`${negative ? "-" : ""}${event.target.value.replace(/^-/, "")}`)}
              error={error}
            />
          </div>
        );
      }
      return (
        <TextField
          label={field.required ? field.label : `${field.label} (optional)`}
          hint={field.hint}
          inputMode={field.decimals === 0 ? "numeric" : "decimal"}
          autoComplete="off"
          enterKeyHint="done"
          unit={unit}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          error={error}
        />
      );
    }
  }
}
