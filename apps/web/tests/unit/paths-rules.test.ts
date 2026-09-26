import { pathChanges, sameSelection, validatePathSelection, type PathConfiguration } from "@ascend/shared";
import { describe, expect, it } from "vitest";

describe("Path rules (ADR-040)", () => {
  it("accepts zero Paths, one PRIMARY, and up to two SECONDARY", () => {
    expect(validatePathSelection({ primary: null, secondary: [] })).toEqual([]);
    expect(validatePathSelection({ primary: "endurance", secondary: [] })).toEqual([]);
    expect(validatePathSelection({ primary: "endurance", secondary: ["strength", "power"] })).toEqual([]);
  });

  it("rejects what the database rejects", () => {
    expect(validatePathSelection({ primary: null, secondary: ["core"] })).toContain("secondary_without_primary");
    expect(validatePathSelection({ primary: "core", secondary: ["strength", "power", "agility"] })).toContain("too_many_secondary");
    expect(validatePathSelection({ primary: "core", secondary: ["core"] })).toContain("duplicate_path");
    expect(validatePathSelection({ primary: "running" as never, secondary: [] })).toContain("unknown_path");
  });

  it("compares selections regardless of SECONDARY order", () => {
    expect(sameSelection({ primary: "core", secondary: ["power", "strength"] }, { primary: "core", secondary: ["strength", "power"] })).toBe(true);
    expect(sameSelection({ primary: "core", secondary: [] }, { primary: "power", secondary: [] })).toBe(false);
  });
});

describe("Path history (ADR-040)", () => {
  const history: PathConfiguration[] = [
    { revision: 1, validFrom: "2026-10-01T10:00:00Z", validUntil: "2026-10-05T10:00:00Z", paths: [{ path: "endurance", priority: "primary" }] },
    {
      revision: 2,
      validFrom: "2026-10-05T10:00:00Z",
      validUntil: "2026-10-09T10:00:00Z",
      paths: [
        { path: "strength", priority: "primary" },
        { path: "endurance", priority: "secondary" },
      ],
    },
    { revision: 3, validFrom: "2026-10-09T10:00:00Z", validUntil: "2026-10-12T10:00:00Z", paths: [] },
    { revision: 4, validFrom: "2026-10-12T10:00:00Z", validUntil: null, paths: [{ path: "endurance", priority: "primary" }] },
  ];

  it("derives activation, priority change, deactivation and reactivation", () => {
    const events = pathChanges(history);
    expect(events[0]!.changes).toEqual([{ kind: "activated", path: "endurance", priority: "primary" }]);
    expect(events[1]!.changes).toEqual([
      { kind: "priority_changed", path: "endurance", from: "primary", to: "secondary" },
      { kind: "activated", path: "strength", priority: "primary" },
    ]);
    expect(events[2]!.changes).toEqual([
      { kind: "deactivated", path: "endurance", priority: "secondary" },
      { kind: "deactivated", path: "strength", priority: "primary" },
    ]);
    expect(events[3]!.changes).toEqual([{ kind: "activated", path: "endurance", priority: "primary" }]);
  });
});
