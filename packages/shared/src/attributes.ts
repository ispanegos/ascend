/**
 * ASCEND v0.1 physical attributes (spec §3).
 *
 * DISCIPLINE is deliberately absent: it is behaviour, not a physical Stat,
 * and is tracked separately (spec §23).
 */
export const ATTRIBUTE_KEYS = [
  "endurance",
  "strength",
  "power",
  "core",
  "mobility",
  "agility",
  "recovery",
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_LABELS: Readonly<Record<AttributeKey, string>> = {
  endurance: "Endurance",
  strength: "Strength",
  power: "Power",
  core: "Core",
  mobility: "Mobility",
  agility: "Agility",
  recovery: "Recovery",
};

export function isAttributeKey(value: string): value is AttributeKey {
  return (ATTRIBUTE_KEYS as readonly string[]).includes(value);
}
