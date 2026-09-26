import { ATTRIBUTE_KEYS, type AttributeKey } from "../attributes";

/**
 * Path rules (spec §18, ADR-040). A Path is an attribute to prioritise, never
 * a sport. The database enforces the same rules; this mirror only gives the
 * athlete immediate, readable feedback.
 */

export type PathKey = AttributeKey;
export const PATH_KEYS: readonly PathKey[] = ATTRIBUTE_KEYS;
export type PathPriority = "primary" | "secondary";
export const MAX_PATHS = 3;
export const MAX_SECONDARY_PATHS = 2;

export interface PathSelection {
  primary: PathKey | null;
  secondary: readonly PathKey[];
}

export type PathRuleError =
  | "secondary_without_primary"
  | "too_many_secondary"
  | "duplicate_path"
  | "unknown_path";

export const PATH_RULE_MESSAGES: Record<PathRuleError, string> = {
  secondary_without_primary: "Choose a PRIMARY Path before adding SECONDARY ones.",
  too_many_secondary: "Up to two SECONDARY Paths.",
  duplicate_path: "Each Path can be chosen once.",
  unknown_path: "That is not one of the seven Paths.",
};

export function isPathKey(value: unknown): value is PathKey {
  return typeof value === "string" && (PATH_KEYS as readonly string[]).includes(value);
}

/** Every rule the selection breaks; empty when it is valid. Zero Paths is valid. */
export function validatePathSelection(selection: PathSelection): PathRuleError[] {
  const errors: PathRuleError[] = [];
  const all = [...(selection.primary ? [selection.primary] : []), ...selection.secondary];
  if (!all.every(isPathKey)) errors.push("unknown_path");
  if (new Set(all).size !== all.length) errors.push("duplicate_path");
  if (!selection.primary && selection.secondary.length > 0) errors.push("secondary_without_primary");
  if (selection.secondary.length > MAX_SECONDARY_PATHS) errors.push("too_many_secondary");
  return errors;
}

export function sameSelection(a: PathSelection, b: PathSelection): boolean {
  return a.primary === b.primary && [...a.secondary].sort().join() === [...b.secondary].sort().join();
}

/** One configuration from `athlete_path_history`, in revision order. */
export interface PathConfiguration {
  revision: number;
  validFrom: string;
  validUntil: string | null;
  paths: ReadonlyArray<{ path: PathKey; priority: PathPriority }>;
}

export type PathChange =
  | { kind: "activated"; path: PathKey; priority: PathPriority }
  | { kind: "priority_changed"; path: PathKey; from: PathPriority; to: PathPriority }
  | { kind: "deactivated"; path: PathKey; priority: PathPriority };

/**
 * What changed at each revision — derived from consecutive configurations,
 * never stored twice (ADR-040). Reactivation is an "activated" change after
 * an earlier "deactivated" one.
 */
export function pathChanges(history: readonly PathConfiguration[]): Array<{ revision: number; at: string; changes: PathChange[] }> {
  const ordered = [...history].sort((a, b) => a.revision - b.revision);
  return ordered.map((config, index) => {
    const before = new Map((ordered[index - 1]?.paths ?? []).map((p) => [p.path, p.priority] as const));
    const after = new Map(config.paths.map((p) => [p.path, p.priority] as const));
    const changes: PathChange[] = [];
    for (const key of PATH_KEYS) {
      const was = before.get(key);
      const now = after.get(key);
      if (!was && now) changes.push({ kind: "activated", path: key, priority: now });
      else if (was && !now) changes.push({ kind: "deactivated", path: key, priority: was });
      else if (was && now && was !== now) changes.push({ kind: "priority_changed", path: key, from: was, to: now });
    }
    return { revision: config.revision, at: config.validFrom, changes };
  });
}
