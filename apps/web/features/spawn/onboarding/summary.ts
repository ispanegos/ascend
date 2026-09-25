import {
  BIOLOGICAL_SEX,
  BODY_CIRCUMFERENCES,
  DATA_SOURCES,
  ENVIRONMENTS,
  RECENT_INACTIVITY,
  TRAINING_EXPERIENCE,
  WEEKDAYS,
  formatNumber,
} from "@ascend/shared";
import type { SerializableContext } from "./StepForm";
import type { EditableStep } from "./steps";

export interface SummaryRow {
  step: EditableStep;
  label: string;
  /** null = not provided. */
  value: string | null;
  required: boolean;
}

function labelOf(options: readonly { value: string; label: string }[], value: string | null): string | null {
  if (value === null) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

function list(options: readonly { value: string; label: string }[], values: readonly string[]): string | null {
  return values.length === 0 ? null : values.map((v) => labelOf(options, v) ?? v).join(", ");
}

/** Profile + context as display rows (spec §9). Display only; nothing derived. */
export function profileSummary(context: SerializableContext): SummaryRow[] {
  const { profile, settings, body } = context;
  const owned = context.catalog.filter((item) => context.owned.some((row) => row.equipment_id === item.id));
  const loads = context.owned
    .filter((row) => row.loads_kg.length > 0)
    .map((row) => {
      const item = context.catalog.find((c) => c.id === row.equipment_id);
      return `${item?.name ?? "Equipment"}: ${row.loads_kg.map((kg) => formatNumber(Number(kg), 2)).join(", ")} kg`;
    });
  const days = context.availability
    .filter((row) => row.available)
    .map((row) => {
      const day = WEEKDAYS.find((w) => w.value === row.weekday)?.short ?? String(row.weekday);
      const window = row.start_time && row.end_time ? ` ${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}` : "";
      return `${day} ${row.max_duration_min ?? "?"} min${window}`;
    });
  const circumferences = BODY_CIRCUMFERENCES.filter(({ value }) => body[value]).map(
    ({ value, label }) => `${label} ${formatNumber(body[value]?.value ?? 0)} cm`,
  );
  const schedule =
    profile.wake_time || profile.sleep_time
      ? `Wake ${profile.wake_time?.slice(0, 5) ?? "—"} · Sleep ${profile.sleep_time?.slice(0, 5) ?? "—"}`
      : null;

  return [
    { step: "name", label: "Name", value: profile.display_name, required: false },
    { step: "birth", label: "Date of birth", value: profile.date_of_birth, required: true },
    {
      step: "sex",
      label: "Biological sex",
      value: labelOf(BIOLOGICAL_SEX, profile.biological_sex) ?? "Not provided",
      required: false,
    },
    { step: "height", label: "Height", value: profile.height_cm ? `${formatNumber(Number(profile.height_cm))} cm` : null, required: true },
    { step: "weight", label: "Weight", value: body.weight ? `${formatNumber(body.weight.value)} kg` : null, required: true },
    { step: "body-fat", label: "Body fat", value: body.body_fat ? `${formatNumber(body.body_fat.value)}%` : null, required: false },
    { step: "measurements", label: "Circumferences", value: circumferences.join(" · ") || null, required: false },
    { step: "experience", label: "Training experience", value: labelOf(TRAINING_EXPERIENCE, profile.training_experience), required: true },
    { step: "activity", label: "Recent activity", value: labelOf(RECENT_INACTIVITY, profile.recent_inactivity), required: true },
    { step: "equipment", label: "Equipment", value: owned.map((item) => item.name).join(", ") || "None", required: false },
    { step: "loads", label: "Weights", value: loads.join(" · ") || null, required: false },
    { step: "environments", label: "Environments", value: list(ENVIRONMENTS, settings.environments), required: true },
    { step: "availability", label: "Availability", value: days.join(" · ") || null, required: true },
    { step: "schedule", label: "Wake and sleep", value: schedule, required: false },
    { step: "sources", label: "Data sources", value: list(DATA_SOURCES, settings.data_sources), required: false },
    { step: "limitations", label: "Injuries or limitations", value: profile.limitations_note, required: false },
  ];
}
