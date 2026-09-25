import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ATTEMPT_COLUMNS, SESSION_KINDS, TEST_CATALOG, TEST_KEYS, isAttemptColumn } from "@ascend/shared";
import { describe, expect, it } from "vitest";
import { SESSION_CONTENT, TEST_CONTENT } from "@/features/spawn/content";

const migration = readFileSync(
  join(__dirname, "..", "..", "..", "..", "supabase", "migrations", "20260926090000_spawn.sql"),
  "utf8",
);

describe("Spawn test catalog (spec §12–§14)", () => {
  it("defines all 17 tests: 7 Movement, 6 Frame, 4 Engine", () => {
    const count = (session: string) => TEST_KEYS.filter((k) => TEST_CATALOG[k].session === session).length;
    expect([count("movement"), count("frame"), count("engine")]).toEqual([7, 6, 4]);
  });

  it("matches the assessment_tests rows seeded by the migration", () => {
    for (const key of TEST_KEYS) {
      const test = TEST_CATALOG[key];
      expect(migration, key).toMatch(new RegExp(`\\('${key}', '${test.session}',\\s+\\d+, '${test.name.replace(/[/&]/g, "\\$&")}'`));
    }
  });

  it("every test has intro copy, setup and steps", () => {
    for (const key of TEST_KEYS) {
      expect(TEST_CONTENT[key].measures, key).toBeTruthy();
      expect(TEST_CONTENT[key].setup.length, key).toBeGreaterThan(0);
      expect(TEST_CONTENT[key].steps.length, key).toBeGreaterThan(0);
    }
    for (const kind of SESSION_KINDS) {
      expect(SESSION_CONTENT[kind].safety.length).toBeGreaterThan(0);
      expect(SESSION_CONTENT[kind].needs.length).toBeGreaterThan(0);
    }
  });

  it("every typed column exists in the attempts table", () => {
    for (const column of ATTEMPT_COLUMNS) expect(migration).toMatch(new RegExp(`\\n  ${column} `));
  });

  it("choice fields have unique options and timers fill real fields", () => {
    for (const key of TEST_KEYS) {
      const test = TEST_CATALOG[key];
      const fields = [...test.attemptFields, ...test.resultFields];
      for (const field of fields) {
        if (field.kind === "choice") {
          const values = field.options.map((o) => o.value);
          expect(new Set(values).size, `${key}.${field.key}`).toBe(values.length);
        }
      }
      if (test.timer?.fillsField) {
        expect(test.attemptFields.some((f) => f.key === test.timer?.fillsField), key).toBe(true);
      }
    }
  });

  it("maps load, text and numeric keys consistently", () => {
    expect(isAttemptColumn("load_kg")).toBe(true);
    expect(isAttemptColumn("depth")).toBe(false);
  });

  it("offers pain as a limit wherever the athlete names a limiting factor (ADR-016)", () => {
    for (const key of TEST_KEYS) {
      for (const field of [...TEST_CATALOG[key].attemptFields, ...TEST_CATALOG[key].resultFields]) {
        if (field.kind === "choice" && (field.key === "limiting_factor" || field.key === "stop_reason")) {
          expect(field.options.some((o) => o.value === "pain"), `${key}.${field.key}`).toBe(true);
        }
      }
    }
  });
});
