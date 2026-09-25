import { describe, expect, it } from "vitest";
import { PIXEL_ICONS } from "@/components/ui/pixel-icons";
import { PIXEL_ICONS_HD } from "@/components/ui/pixel-icons-hd";

describe("pixel icon set (V2 §10)", () => {
  it.each(Object.entries(PIXEL_ICONS))("%s is a 16×16 grid of known tones", (_name, rows) => {
    expect(rows).toHaveLength(16);
    for (const row of rows) expect(row).toMatch(/^[.ofh]{16}$/);
    expect(rows.join("")).toMatch(/o/);
  });

  it("covers every attribute and Overall", () => {
    for (const name of ["endurance", "strength", "power", "core", "mobility", "agility", "recovery", "overall"]) {
      expect(PIXEL_ICONS).toHaveProperty(name);
    }
  });
});

describe("detailed pixel icons (V2 pass 2)", () => {
  it.each(Object.entries(PIXEL_ICONS_HD))("%s is a square 24- or 32-grid of the five tones", (_name, rows) => {
    expect([24, 32]).toContain(rows.length);
    for (const row of rows) expect(row).toMatch(new RegExp(`^[.ofslh]{${rows.length}}$`));
    expect(rows.join("")).toMatch(/f/);
  });

  it("covers every attribute, Overall, the navigation and the brand mark", () => {
    for (const name of ["endurance", "strength", "power", "core", "mobility", "agility", "recovery", "overall", "today", "quest", "ascend", "stats", "you", "ascend-mark"]) {
      expect(PIXEL_ICONS_HD).toHaveProperty(name);
    }
  });
});
