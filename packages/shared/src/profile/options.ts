import type { NumberRule } from "../units";

/**
 * Profile option sets (spec §9, §58). The spec names the fields but not the
 * choices; these are listed for product review in ADR-017. Every list here
 * matches a Postgres check constraint.
 */

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

/** Context only — never used to assign Stats (ADR-023). */
export const TRAINING_EXPERIENCE = [
  { value: "never_trained", label: "Never trained" },
  { value: "beginner", label: "Beginner" },
  { value: "recreational", label: "Recreational" },
  { value: "trained", label: "Trained" },
  { value: "competitive", label: "Competitive" },
] as const satisfies readonly Option[];

export type TrainingExperience = (typeof TRAINING_EXPERIENCE)[number]["value"];

/** Context only — never used to assign Stats (ADR-023). */
export const RECENT_INACTIVITY = [
  { value: "active", label: "Training regularly now" },
  { value: "under_1_month", label: "Less than a month off" },
  { value: "1_3_months", label: "1–3 months off" },
  { value: "3_6_months", label: "3–6 months off" },
  { value: "6_12_months", label: "6–12 months off" },
  { value: "over_12_months", label: "More than a year off" },
] as const satisfies readonly Option[];

export type RecentInactivity = (typeof RECENT_INACTIVITY)[number]["value"];

export const BIOLOGICAL_SEX = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const satisfies readonly Option[];

export type BiologicalSex = (typeof BIOLOGICAL_SEX)[number]["value"];

export const ENVIRONMENTS = [
  { value: "road", label: "Road" },
  { value: "track", label: "Running track" },
  { value: "flat_terrain", label: "Flat paths" },
  { value: "hills", label: "Hills" },
  { value: "off_road", label: "Off-road" },
  { value: "beach", label: "Beach" },
  { value: "park", label: "Park / open space" },
  { value: "gym", label: "Gym" },
  { value: "home", label: "Home" },
  { value: "treadmill", label: "Treadmill" },
] as const satisfies readonly Option[];

export type Environment = (typeof ENVIRONMENTS)[number]["value"];

export const DATA_SOURCES = [
  { value: "apple_watch", label: "Apple Watch" },
  { value: "garmin", label: "Garmin" },
  { value: "polar", label: "Polar" },
  { value: "coros", label: "COROS" },
  { value: "suunto", label: "Suunto" },
  { value: "fitbit", label: "Fitbit / Google" },
  { value: "whoop", label: "WHOOP" },
  { value: "oura", label: "Oura" },
  { value: "hr_strap", label: "Heart-rate chest strap" },
  { value: "smart_scale", label: "Smart scale" },
  { value: "phone", label: "Phone only" },
  { value: "none", label: "None" },
] as const satisfies readonly Option[];

export type DataSource = (typeof DATA_SOURCES)[number]["value"];

/** ISO weekdays, 1 = Monday. */
export const WEEKDAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 7, label: "Sunday", short: "Sun" },
] as const;

export const SESSION_LENGTHS_MIN = [20, 30, 45, 60, 75, 90, 120] as const;

/** Common implement weights, offered as quick picks; any value can be added. */
export const COMMON_LOADS_KG: Readonly<Record<string, readonly number[]>> = {
  kettlebell: [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48],
  dumbbell: [2, 4, 5, 6, 8, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30],
  barbell: [7, 10, 15, 20],
  weight_plates: [1.25, 2.5, 5, 10, 15, 20, 25],
  sandbag: [10, 15, 20, 25, 30, 40, 50],
  medicine_ball: [2, 3, 4, 5, 6, 8, 10],
  sledgehammer: [4, 5, 6, 8, 10],
};

export const BODY_CIRCUMFERENCES = [
  { value: "waist", label: "Waist" },
  { value: "chest", label: "Chest" },
  { value: "hip", label: "Hip" },
  { value: "thigh", label: "Thigh" },
  { value: "arm", label: "Arm" },
] as const satisfies readonly Option[];

export type Circumference = (typeof BODY_CIRCUMFERENCES)[number]["value"];

// Plausibility bounds. They match the Postgres checks and catch typos; they are
// not medical validation.
export const HEIGHT_RULE: NumberRule = { min: 100, max: 250, decimals: 1, unit: "cm" };
export const WEIGHT_RULE: NumberRule = { min: 30, max: 350, decimals: 1, unit: "kg" };
export const BODY_FAT_RULE: NumberRule = { min: 2, max: 75, decimals: 1, unit: "percent" };
/** Outside these, a value is saved only after the athlete confirms it (ADR-023 §7). */
export const HEIGHT_TYPICAL = [140, 215] as const;
export const WEIGHT_TYPICAL = [40, 200] as const;
export const BODY_FAT_TYPICAL = [5, 50] as const;
export const CIRCUMFERENCE_RULE: NumberRule = { min: 10, max: 250, decimals: 1, unit: "cm" };
export const LOAD_RULE: NumberRule = { min: 0.5, max: 250, decimals: 2, unit: "kg" };
/** ASCEND v0.1 is 18+ (ADR-023). */
export const MIN_AGE_YEARS = 18;
export const MAX_AGE_YEARS = 110;
export const MAX_NOTE_LENGTH = 1000;

export function isOption<T extends string>(options: readonly Option<T>[], value: unknown): value is T {
  return typeof value === "string" && options.some((option) => option.value === value);
}
