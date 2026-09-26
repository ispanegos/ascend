import Link from "next/link";
import { cx } from "@/lib/cx";
import styles from "./AthleteBodyAvatar.module.css";

/**
 * Inputs a future milestone will use to shape the figure. All optional:
 * the component must work with none, some or all of them.
 */
export interface BodyMeasurements {
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_percentage?: number | null;
  waist_cm?: number | null;
  chest_cm?: number | null;
  hips_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
}

/** Which body the figure shows. Only "current" exists in product today. */
export type BodyView = "current" | "start" | "target";

/** Derived from which inputs exist — presentation only, no morphology maths. */
export type BodyDataState = "no-data" | "partial" | "estimated";

export function bodyDataState(m: BodyMeasurements): BodyDataState {
  const present = Object.values(m).filter((v) => typeof v === "number").length;
  if (present === 0) return "no-data";
  return m.height_cm && m.weight_kg && m.body_fat_percentage ? "estimated" : "partial";
}

const ROWS: ReadonlyArray<{ key: keyof BodyMeasurements; label: string; unit: string }> = [
  { key: "height_cm", label: "Height", unit: "cm" },
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "body_fat_percentage", label: "Body fat", unit: "%" },
  { key: "chest_cm", label: "Chest", unit: "cm" },
  { key: "waist_cm", label: "Waist", unit: "cm" },
  { key: "hips_cm", label: "Hips", unit: "cm" },
  { key: "arm_cm", label: "Arm", unit: "cm" },
  { key: "thigh_cm", label: "Thigh", unit: "cm" },
];

/** Where each circumference is marked on the 120×260 figure. */
const MARKS: ReadonlyArray<{ key: keyof BodyMeasurements; y: number; x1: number; x2: number }> = [
  { key: "chest_cm", y: 72, x1: 38, x2: 82 },
  { key: "waist_cm", y: 108, x1: 41, x2: 79 },
  { key: "hips_cm", y: 130, x1: 41, x2: 79 },
  { key: "thigh_cm", y: 166, x1: 44, x2: 59 },
  { key: "arm_cm", y: 88, x1: 27, x2: 36 },
];

const STATE_TEXT: Record<BodyDataState, string> = {
  "no-data": "No body data yet",
  partial: "Estimated · partial data",
  estimated: "Estimated representation",
};

const VIEW_TEXT: Record<BodyView, string> = { current: "Current", start: "Start", target: "Target preview" };

// Left half of a neutral, faceless figure; mirrored for the right half.
const HALF =
  "M60 40 L54 40 C54 44 53 47 50 49 C44 51 36 52 33 56 C30 60 29 66 29 72 L27 96 C26 108 24 122 22 136 C21 142 20 148 21 152 C23 156 26 155 27 150 C29 140 31 126 33 112 L35 96 C36 88 37 80 38 76 C40 88 40 100 41 110 C41 118 40 124 41 130 C42 142 43 150 44 160 C45 178 45 192 46 206 C47 220 46 236 47 246 C47 250 46 254 44 256 L56 256 C57 252 57 250 57 246 C58 232 58 218 57 206 C57 190 58 176 58 162 L60 150 Z";

function Figure({ measurements, view }: { measurements: BodyMeasurements; view: BodyView }) {
  const has = (key: keyof BodyMeasurements) => typeof measurements[key] === "number";
  return (
    <svg className={cx(styles.figure, view === "target" && styles.target)} viewBox="0 0 120 262" aria-hidden="true">
      <defs>
        <linearGradient id="body-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g className={styles.silhouette}>
        <ellipse cx="60" cy="24" rx="12.5" ry="15.5" />
        <path d={HALF} />
        <path d={HALF} transform="translate(120 0) scale(-1 1)" />
      </g>
      {/* Anatomical landmarks, faint: clavicles, chest, midline, knees. */}
      <g className={styles.landmarks}>
        <path d="M50 50 C54 53 58 53 60 52 C62 53 66 53 70 50" />
        <path d="M42 74 C48 80 56 80 60 77 C64 80 72 80 78 74" />
        <path d="M60 80 L60 128" />
        <path d="M50 96 L70 96 M51 106 L69 106 M52 116 L68 116" />
        <path d="M47 206 C49 210 53 210 55 206 M65 206 C67 210 71 210 73 206" />
      </g>
      {/* Measured circumferences only: a mark says "this input exists". */}
      <g className={styles.marks}>
        {MARKS.filter((m) => has(m.key)).map((m) => (
          <g key={m.key}>
            <line x1={m.x1} y1={m.y} x2={m.x2} y2={m.y} />
            {m.key === "thigh_cm" ? <line x1={120 - m.x2} y1={m.y} x2={120 - m.x1} y2={m.y} /> : null}
            {m.key === "arm_cm" ? <line x1={120 - m.x2} y1={m.y} x2={120 - m.x1} y2={m.y} /> : null}
          </g>
        ))}
        {has("height_cm") ? <path className={styles.height} d="M112 8 L116 8 M114 8 L114 256 M112 256 L116 256" /> : null}
      </g>
    </svg>
  );
}

/**
 * ATHLETE BODY (V2 §22, final polish) — UI architecture only.
 *
 * A neutral, faceless, monochrome mannequin standing for the athlete's
 * estimated real morphology. Today the figure is a static placeholder: it
 * does NOT change with the measurements, and no morphology is calculated.
 * A future milestone will shape it from the inputs in `BodyMeasurements`.
 * It is always an estimate, never a body scan.
 */
export function AthleteBodyAvatar({
  measurements,
  view = "current",
  editHref,
}: {
  measurements: BodyMeasurements;
  view?: BodyView;
  /** Where to add or change measurements. */
  editHref?: string;
}) {
  const state = bodyDataState(measurements);
  const present = ROWS.filter((row) => typeof measurements[row.key] === "number");
  return (
    <div className={cx(styles.card, styles[state])}>
      <div className={styles.stage}>
        <Figure measurements={measurements} view={view} />
      </div>
      <div className={styles.side}>
        <span className={styles.view}>{VIEW_TEXT[view]}</span>
        <p className={styles.state}>{STATE_TEXT[state]}</p>
        {present.length ? (
          <dl className={styles.list}>
            {present.map((row) => (
              <div key={row.key} className={styles.row}>
                <dt>{row.label}</dt>
                <dd className="stat-number">
                  {measurements[row.key]}
                  <span className={styles.unit}>{row.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.note}>Add your measurements and ASCEND will estimate your shape.</p>
        )}
        <p className={styles.note}>An estimate of your shape, not a body scan. The figure will follow your measurements in a later release.</p>
        {editHref ? (
          <Link href={editHref} className={styles.edit}>
            {state === "no-data" ? "Add measurements" : "Update measurements"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
