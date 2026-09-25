"use client";

import {
  BIOLOGICAL_SEX,
  BODY_CIRCUMFERENCES,
  COMMON_LOADS_KG,
  DATA_SOURCES,
  ENVIRONMENTS,
  RECENT_INACTIVITY,
  SESSION_LENGTHS_MIN,
  TRAINING_EXPERIENCE,
  WEEKDAYS,
  formatNumber,
  type AvailabilityInput,
} from "@ascend/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { FlowHeader } from "@/components/shell/FlowHeader";
import { Button } from "@/components/ui/Button";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { MobileActionBar } from "@/components/ui/MobileActionBar";
import { Switch } from "@/components/ui/Switch";
import { TextArea } from "@/components/ui/TextArea";
import { TextField } from "@/components/ui/TextField";
import { safely } from "@/lib/safe-action";
import type { getSerializableContext } from "../data";
import { onboardingPath } from "../routing";
import { saveProfileStep, startProfile, type StepInput, type StepMode } from "./actions";
import { stepPosition, type EditableStep, type OnboardingStep } from "./steps";
import styles from "./onboarding.module.css";

export type SerializableContext = Awaited<ReturnType<typeof getSerializableContext>>;

interface StepFormProps {
  step: OnboardingStep;
  mode: StepMode;
  context: SerializableContext;
  backHref: string | undefined;
  /** After saving, go here instead of the next step (e.g. back to Review). */
  returnTo?: string | undefined;
}

type Errors = Record<string, string>;

/** Profile + Body/Context screens (spec §9, §11 Spawn 0). */
export function StepForm(props: StepFormProps) {
  if (props.step === "welcome") return <Welcome />;
  if (props.step === "review") return null; // Rendered by the review page.
  return <EditStep {...props} step={props.step} />;
}

// ---------------------------------------------------------------------------
// Scaffold
// ---------------------------------------------------------------------------

function Scaffold({
  step,
  mode,
  backHref,
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  step: OnboardingStep;
  mode: StepMode;
  backHref: string | undefined;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
}) {
  const position = stepPosition(step);
  return (
    <>
      <FlowHeader
        backHref={backHref}
        context={mode === "edit" ? "Edit profile" : "Spawn 0 · Body & context"}
        progress={
          mode === "onboarding" && position
            ? {
                value: position.index - 1,
                max: position.total,
                label: "Profile setup",
                text: `${position.index} of ${position.total}`,
              }
            : undefined
        }
        exitHref={mode === "edit" ? "/profile" : "/today"}
      />
      <main id="main" className={styles.main}>
        <header className={styles.header}>
          {eyebrow ? <p className="text-label text-muted">{eyebrow}</p> : null}
          <h1 className="text-h1">{title}</h1>
          {description ? <div className={styles.description}>{description}</div> : null}
        </header>
        <div className={styles.body}>{children}</div>
        <MobileActionBar>{actions}</MobileActionBar>
      </main>
    </>
  );
}

function useSave(mode: StepMode, returnTo: string | undefined) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function save(input: StepInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await safely(() => saveProfileStep(input, mode));
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      setErrors({});
      router.push(returnTo ?? result.redirectTo ?? "/");
      router.refresh();
    });
  }

  return { save, pending, errors, setErrors, formError };
}

function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className={styles.formError} role="alert">
      {message}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------

function Welcome() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    startTransition(async () => {
      const result = await safely(() => startProfile());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo ?? onboardingPath("name"));
    });
  }

  return (
    <>
      <FlowHeader context="Spawn" />
      <main id="main" className={styles.main}>
        <header className={styles.welcome}>
          <p className="text-label text-muted">Spawn</p>
          <h1 className="text-display">Create your athlete profile.</h1>
          <p className={styles.lede}>
            Before ASCEND measures anything, it needs context: your body, your equipment and when you can train.
          </p>
        </header>
        <ul className={styles.facts}>
          <li>
            <span className="text-label text-muted">Time</span>
            <span>About 5 minutes</span>
          </li>
          <li>
            <span className="text-label text-muted">Covers</span>
            <span>Body, experience, equipment, availability</span>
          </li>
          <li>
            <span className="text-label text-muted">Progress</span>
            <span>Saved as you go — stop any time</span>
          </li>
        </ul>
        <MobileActionBar>
          <FormError message={error} />
          <Button onClick={start} loading={pending}>
            Create profile
          </Button>
        </MobileActionBar>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function EditStep({ step, mode, context, backHref, returnTo }: StepFormProps & { step: EditableStep }) {
  const { save, pending, errors, setErrors, formError } = useSave(mode, returnTo);
  const cta = mode === "edit" ? "Save" : "Continue";
  const common = { step, mode, backHref } as const;

  const { profile, settings } = context;

  switch (step) {
    case "name":
      return (
        <TextStep
          {...common}
          title="What should ASCEND call you?"
          label="Name"
          initial={profile.display_name ?? ""}
          autoComplete="nickname"
          onSave={(value) => save({ step, displayName: value })}
          pending={pending}
          error={errors.displayName}
          formError={formError}
          cta={cta}
        />
      );
    case "birth":
      return (
        <TextStep
          {...common}
          title="When were you born?"
          description="Age helps interpret results. It never limits what you can do."
          label="Date of birth"
          type="date"
          initial={profile.date_of_birth ?? ""}
          autoComplete="bday"
          onSave={(value) => save({ step, dateOfBirth: value })}
          pending={pending}
          error={errors.dateOfBirth}
          formError={formError}
          cta={cta}
        />
      );
    case "sex":
      return (
        <ChoiceStep
          {...common}
          title="Biological sex"
          description="Optional. Only used if a test genuinely needs sex-specific normalisation."
          options={[...BIOLOGICAL_SEX, { value: "", label: "Prefer not to say" }]}
          initial={profile.biological_sex ?? (mode === "edit" || settings.onboarding_step !== "sex" ? "" : null)}
          onSave={(value) => save({ step, sex: value })}
          pending={pending}
          error={errors.sex}
          formError={formError}
          cta={cta}
        />
      );
    case "height":
      return (
        <TextStep
          {...common}
          title="How tall are you?"
          label="Height"
          unit="cm"
          inputMode="decimal"
          initial={profile.height_cm === null ? "" : String(profile.height_cm)}
          onSave={(value) => save({ step, heightCm: value })}
          pending={pending}
          error={errors.heightCm}
          formError={formError}
          cta={cta}
        />
      );
    case "weight":
      return (
        <TextStep
          {...common}
          title="What do you weigh today?"
          description="Body weight is context, never a Stat."
          label="Weight"
          unit="kg"
          inputMode="decimal"
          initial={context.body.weight ? String(context.body.weight.value) : ""}
          onSave={(value) => save({ step, weightKg: value })}
          pending={pending}
          error={errors.weightKg}
          formError={formError}
          cta={cta}
        />
      );
    case "body-fat":
      return (
        <TextStep
          {...common}
          title="Body fat"
          description="Optional. Only if you know it from a scale or scan."
          label="Estimated body fat"
          unit="%"
          inputMode="decimal"
          optional
          initial={context.body.body_fat ? String(context.body.body_fat.value) : ""}
          onSave={(value) => save({ step, bodyFat: value })}
          pending={pending}
          error={errors.bodyFat}
          formError={formError}
          cta={cta}
        />
      );
    case "measurements":
      return (
        <MeasurementsStep
          {...common}
          context={context}
          onSave={(values) => save({ step, values })}
          pending={pending}
          errors={errors}
          formError={formError}
          cta={cta}
        />
      );
    case "experience":
      return (
        <ChoiceStep
          {...common}
          title="How much structured training have you done?"
          options={TRAINING_EXPERIENCE}
          initial={profile.training_experience}
          onSave={(value) => save({ step, value })}
          pending={pending}
          error={errors.value}
          formError={formError}
          cta={cta}
        />
      );
    case "activity":
      return (
        <ChoiceStep
          {...common}
          title="How active have you been recently?"
          description="Returning after time off changes how ASCEND starts you — not what it expects of you."
          options={RECENT_INACTIVITY}
          initial={profile.recent_inactivity}
          onSave={(value) => save({ step, value })}
          pending={pending}
          error={errors.value}
          formError={formError}
          cta={cta}
        />
      );
    case "equipment":
      return (
        <EquipmentStep
          {...common}
          context={context}
          onSave={(keys) => save({ step, keys })}
          pending={pending}
          error={errors.keys}
          formError={formError}
          cta={cta}
        />
      );
    case "loads":
      return (
        <LoadsStep
          {...common}
          context={context}
          onSave={(loads) => save({ step, loads })}
          pending={pending}
          errors={errors}
          formError={formError}
          cta={cta}
        />
      );
    case "environments":
      return (
        <MultiStep
          {...common}
          title="Where can you train?"
          description="Choose every place that applies."
          legend="Environments"
          options={ENVIRONMENTS}
          initial={settings.environments}
          onSave={(values) => save({ step, values })}
          pending={pending}
          error={errors.values}
          formError={formError}
          cta={cta}
        />
      );
    case "availability":
      return (
        <AvailabilityStep
          {...common}
          context={context}
          onSave={(days) => save({ step, days })}
          pending={pending}
          errors={errors}
          clearErrors={() => setErrors({})}
          formError={formError}
          cta={cta}
        />
      );
    case "schedule":
      return (
        <ScheduleStep
          {...common}
          wake={profile.wake_time?.slice(0, 5) ?? ""}
          sleep={profile.sleep_time?.slice(0, 5) ?? ""}
          onSave={(wake, sleep) => save({ step, wake, sleep })}
          pending={pending}
          errors={errors}
          formError={formError}
          cta={cta}
        />
      );
    case "sources":
      return (
        <MultiStep
          {...common}
          title="What do you track with?"
          description="ASCEND works without any device. For now, you enter readings by hand."
          legend="Devices and data sources"
          options={DATA_SOURCES}
          exclusive="none"
          initial={settings.data_sources}
          onSave={(values) => save({ step, values })}
          pending={pending}
          error={errors.values}
          formError={formError}
          cta={cta}
        />
      );
    case "limitations":
      return (
        <NoteStep
          {...common}
          initial={profile.limitations_note ?? ""}
          onSave={(note) => save({ step, note })}
          pending={pending}
          error={errors.note}
          formError={formError}
          cta={cta}
        />
      );
  }
}

interface StepCommon {
  step: OnboardingStep;
  mode: StepMode;
  backHref: string | undefined;
  pending: boolean;
  formError: string | null;
  cta: string;
}

function TextStep({
  title,
  description,
  label,
  initial,
  onSave,
  error,
  unit,
  type = "text",
  inputMode,
  autoComplete = "off",
  optional = false,
  ...common
}: StepCommon & {
  title: string;
  description?: string;
  label: string;
  initial: string;
  onSave: (value: string) => void;
  error: string | undefined;
  unit?: string;
  type?: "text" | "date";
  inputMode?: "decimal" | "numeric";
  autoComplete?: string;
  optional?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Scaffold
      {...common}
      title={title}
      description={description}
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(value)} loading={common.pending}>
            {common.cta}
          </Button>
          {optional && common.mode === "onboarding" ? (
            <Button variant="ghost" onClick={() => onSave("")} disabled={common.pending}>
              Skip
            </Button>
          ) : null}
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(value);
        }}
      >
        <TextField
          label={optional ? `${label} (optional)` : label}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          enterKeyHint="done"
          unit={unit}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={error}
          className={styles.bigField}
        />
      </form>
    </Scaffold>
  );
}

function ChoiceStep({
  title,
  description,
  options,
  initial,
  onSave,
  error,
  ...common
}: StepCommon & {
  title: string;
  description?: string;
  options: readonly { value: string; label: string }[];
  /** null = not answered yet. */
  initial: string | null;
  onSave: (value: string) => void;
  error: string | undefined;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <Scaffold
      {...common}
      title={title}
      description={description}
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => value !== null && onSave(value)} loading={common.pending} disabled={value === null}>
            {common.cta}
          </Button>
        </>
      }
    >
      <ChipGroup
        legend={title}
        hideLegend
        layout="stack"
        options={options}
        value={value === null ? [] : [value]}
        onChange={(next) => setValue(next[0] ?? null)}
        error={error}
      />
    </Scaffold>
  );
}

function MultiStep({
  title,
  description,
  legend,
  options,
  initial,
  exclusive,
  onSave,
  error,
  ...common
}: StepCommon & {
  title: string;
  description?: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  initial: readonly string[];
  /** A value that can't be combined with others (e.g. "None"). */
  exclusive?: string;
  onSave: (values: string[]) => void;
  error: string | undefined;
}) {
  const [values, setValues] = useState<string[]>([...initial]);
  return (
    <Scaffold
      {...common}
      title={title}
      description={description}
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(values)} loading={common.pending}>
            {common.cta}
          </Button>
        </>
      }
    >
      <ChipGroup
        legend={legend}
        hideLegend
        multiple
        options={options}
        value={values}
        onChange={(next) => {
          if (exclusive && next.includes(exclusive) && !values.includes(exclusive)) setValues([exclusive]);
          else setValues(exclusive ? next.filter((v) => v !== exclusive || next.length === 1) : next);
        }}
        error={error}
      />
    </Scaffold>
  );
}

function MeasurementsStep({
  context,
  onSave,
  errors,
  ...common
}: StepCommon & {
  context: SerializableContext;
  onSave: (values: Record<string, string>) => void;
  errors: Errors;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      BODY_CIRCUMFERENCES.map(({ value }) => [value, context.body[value] ? String(context.body[value]?.value) : ""]),
    ),
  );
  return (
    <Scaffold
      {...common}
      title="Circumferences"
      description="Optional. Measure relaxed, tape level, in centimetres. Leave any blank."
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(values)} loading={common.pending}>
            {common.cta}
          </Button>
          {common.mode === "onboarding" ? (
            <Button variant="ghost" onClick={() => onSave({})} disabled={common.pending}>
              Skip
            </Button>
          ) : null}
        </>
      }
    >
      <div className={styles.fieldGrid}>
        {BODY_CIRCUMFERENCES.map(({ value, label }) => (
          <TextField
            key={value}
            label={label}
            inputMode="decimal"
            autoComplete="off"
            unit="cm"
            value={values[value] ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, [value]: event.target.value }))}
            error={errors[value]}
          />
        ))}
      </div>
    </Scaffold>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  free_weight: "Free weights",
  bodyweight: "Bodyweight",
  accessory: "Accessories",
  conditioning: "Conditioning",
  cardio: "Cardio machines",
};

function EquipmentStep({
  context,
  onSave,
  error,
  ...common
}: StepCommon & { context: SerializableContext; onSave: (keys: string[]) => void; error: string | undefined }) {
  const ownedIds = new Set(context.owned.map((row) => row.equipment_id));
  const [keys, setKeys] = useState<string[]>(
    context.catalog.filter((item) => ownedIds.has(item.id)).map((item) => item.key),
  );
  const categories = [...new Set(context.catalog.map((item) => item.category))];

  return (
    <Scaffold
      {...common}
      title="What equipment can you use?"
      description="Tests and Quests adapt to it. You can change this any time in Profile."
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(keys)} loading={common.pending}>
            {keys.length === 0 ? "Continue with no equipment" : common.cta}
          </Button>
        </>
      }
    >
      <div className={styles.groups}>
        {categories.map((category) => {
          const items = context.catalog.filter((item) => item.category === category);
          const itemKeys = items.map((item) => item.key);
          return (
            <ChipGroup
              key={category}
              legend={CATEGORY_LABELS[category] ?? category}
              multiple
              options={items.map((item) => ({ value: item.key, label: item.name }))}
              value={keys.filter((key) => itemKeys.includes(key))}
              onChange={(next) => setKeys([...keys.filter((key) => !itemKeys.includes(key)), ...next])}
            />
          );
        })}
      </div>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
    </Scaffold>
  );
}

function LoadsStep({
  context,
  onSave,
  errors,
  ...common
}: StepCommon & {
  context: SerializableContext;
  onSave: (loads: Record<string, string[]>) => void;
  errors: Errors;
}) {
  const loadable = context.owned
    .map((row) => ({ row, item: context.catalog.find((item) => item.id === row.equipment_id) }))
    .filter((entry): entry is { row: (typeof context.owned)[number]; item: (typeof context.catalog)[number] } =>
      Boolean(entry.item && entry.item.load_mode !== "none"),
    );

  const [loads, setLoads] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(loadable.map(({ row, item }) => [item.key, row.loads_kg.map((kg) => String(Number(kg)))])),
  );
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  function addCustom(key: string) {
    const text = (custom[key] ?? "").trim().replace(",", ".");
    const value = Number(text);
    if (text === "" || !Number.isFinite(value) || value <= 0 || value > 250) {
      setCustomErrors((current) => ({ ...current, [key]: "Enter a weight from 0.5 to 250 kg." }));
      return;
    }
    const existing = loads[key] ?? [];
    if (existing.some((kg) => Number(kg) === value)) {
      setCustomErrors((current) => ({ ...current, [key]: `${formatNumber(value, 2)} kg is already listed.` }));
      return;
    }
    // Stored as the canonical number string so it matches the quick-pick chips.
    setLoads((current) => ({ ...current, [key]: [...existing, String(value)] }));
    setCustom((current) => ({ ...current, [key]: "" }));
    setCustomErrors((current) => ({ ...current, [key]: "" }));
  }

  return (
    <Scaffold
      {...common}
      title="Which weights do you have?"
      description="The load picker in The Frame uses exactly these."
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(loads)} loading={common.pending}>
            {common.cta}
          </Button>
        </>
      }
    >
      <div className={styles.groups}>
        {loadable.length === 0 ? <p className="text-muted">None of your equipment takes weights.</p> : null}
        {loadable.map(({ item }) => {
          const selected = loads[item.key] ?? [];
          const quick = (COMMON_LOADS_KG[item.key] ?? []).map(String);
          const options = [...new Set([...quick, ...selected])]
            .sort((a, b) => Number(a) - Number(b))
            .map((kg) => ({ value: kg, label: `${formatNumber(Number(kg), 2)} kg` }));
          return (
            <section key={item.key} className={styles.loadGroup} aria-label={item.name}>
              <ChipGroup
                legend={item.name}
                hint={item.load_mode === "bar" ? "Bar weights." : "Weight of each one you own."}
                multiple
                options={options}
                value={selected}
                onChange={(next) => setLoads((current) => ({ ...current, [item.key]: next }))}
                error={errors[item.key]}
              />
              <div className={styles.addRow}>
                <TextField
                  label={`Add a ${item.name.toLowerCase().replace(/s$/, "")} weight`}
                  inputMode="decimal"
                  autoComplete="off"
                  unit="kg"
                  value={custom[item.key] ?? ""}
                  onChange={(event) => setCustom((current) => ({ ...current, [item.key]: event.target.value }))}
                  error={customErrors[item.key] || undefined}
                />
                <Button variant="secondary" fit="auto" onClick={() => addCustom(item.key)}>
                  Add
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </Scaffold>
  );
}

function AvailabilityStep({
  context,
  onSave,
  errors,
  clearErrors,
  ...common
}: StepCommon & {
  context: SerializableContext;
  onSave: (days: AvailabilityInput[]) => void;
  errors: Errors;
  clearErrors: () => void;
}) {
  const [days, setDays] = useState<AvailabilityInput[]>(() =>
    WEEKDAYS.map(({ value }) => {
      const row = context.availability.find((r) => r.weekday === value);
      return {
        weekday: value,
        available: row?.available ?? false,
        start: row?.start_time?.slice(0, 5) ?? "",
        end: row?.end_time?.slice(0, 5) ?? "",
        maxDurationMin: row?.max_duration_min ? String(row.max_duration_min) : "",
      };
    }),
  );
  const [windows, setWindows] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(days.map((d) => [d.weekday, d.start !== ""])),
  );

  function update(weekday: number, patch: Partial<AvailabilityInput>) {
    clearErrors();
    setDays((current) => current.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)));
  }

  return (
    <Scaffold
      {...common}
      title="When can you train?"
      description="Turn on the days you can train and how long you have. Rest days are part of the plan."
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(days)} loading={common.pending}>
            {common.cta}
          </Button>
        </>
      }
    >
      {errors.days ? (
        <p className={styles.formError} role="alert">
          {errors.days}
        </p>
      ) : null}
      <ul className={styles.days}>
        {days.map((day) => {
          const meta = WEEKDAYS.find((w) => w.value === day.weekday);
          const label = meta?.label ?? String(day.weekday);
          const error = errors[String(day.weekday)];
          return (
            <li key={day.weekday} className={styles.day}>
              <Switch
                label={label}
                checked={day.available}
                stateLabels={["Available", "Rest"]}
                onChange={(available) =>
                  update(day.weekday, available ? { available } : { available, start: "", end: "", maxDurationMin: "" })
                }
              />
              {day.available ? (
                <div className={styles.dayDetail}>
                  <ChipGroup
                    legend={`${label}: longest session`}
                    options={SESSION_LENGTHS_MIN.map((min) => ({ value: String(min), label: `${min} min` }))}
                    value={day.maxDurationMin ? [day.maxDurationMin] : []}
                    onChange={(next) => update(day.weekday, { maxDurationMin: next[0] ?? "" })}
                  />
                  {windows[day.weekday] ? (
                    <div className={styles.timeRow}>
                      <TextField
                        label="From"
                        type="time"
                        value={day.start}
                        onChange={(event) => update(day.weekday, { start: event.target.value })}
                      />
                      <TextField
                        label="To"
                        type="time"
                        value={day.end}
                        onChange={(event) => update(day.weekday, { end: event.target.value })}
                      />
                    </div>
                  ) : null}
                  <Button
                    variant="ghost"
                    fit="auto"
                    onClick={() => {
                      const open = !windows[day.weekday];
                      setWindows((current) => ({ ...current, [day.weekday]: open }));
                      if (!open) update(day.weekday, { start: "", end: "" });
                    }}
                  >
                    {windows[day.weekday] ? "Any time that day" : "Set a time window"}
                  </Button>
                  {error ? (
                    <p className={styles.fieldError}>
                      <span aria-hidden="true">!</span> {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Scaffold>
  );
}

function ScheduleStep({
  wake,
  sleep,
  onSave,
  errors,
  ...common
}: StepCommon & { wake: string; sleep: string; onSave: (wake: string, sleep: string) => void; errors: Errors }) {
  const [values, setValues] = useState({ wake, sleep });
  return (
    <Scaffold
      {...common}
      title="Usual wake and sleep times"
      description="Optional. Helps place Quests and read recovery later."
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(values.wake, values.sleep)} loading={common.pending}>
            {common.cta}
          </Button>
          {common.mode === "onboarding" ? (
            <Button variant="ghost" onClick={() => onSave("", "")} disabled={common.pending}>
              Skip
            </Button>
          ) : null}
        </>
      }
    >
      <div className={styles.timeRow}>
        <TextField
          label="Wake"
          type="time"
          value={values.wake}
          onChange={(event) => setValues((current) => ({ ...current, wake: event.target.value }))}
          error={errors.wake}
        />
        <TextField
          label="Sleep"
          type="time"
          value={values.sleep}
          onChange={(event) => setValues((current) => ({ ...current, sleep: event.target.value }))}
          error={errors.sleep}
        />
      </div>
    </Scaffold>
  );
}

function NoteStep({
  initial,
  onSave,
  error,
  ...common
}: StepCommon & { initial: string; onSave: (note: string) => void; error: string | undefined }) {
  const [note, setNote] = useState(initial);
  return (
    <Scaffold
      {...common}
      title="Injuries or limitations"
      description="Optional. Anything ASCEND should keep in mind. This is your note — ASCEND never diagnoses."
      actions={
        <>
          <FormError message={common.formError} />
          <Button onClick={() => onSave(note)} loading={common.pending}>
            {common.cta}
          </Button>
        </>
      }
    >
      <TextArea
        label="Notes (optional)"
        value={note}
        maxLength={1000}
        onChange={(event) => setNote(event.target.value)}
        error={error}
      />
    </Scaffold>
  );
}
