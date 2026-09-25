import { describe, expect, it } from "vitest";
import { PIXEL_ICONS } from "@/components/ui/pixel-icons";

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
