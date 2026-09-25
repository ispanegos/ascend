import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("web app manifest (spec §41)", () => {
  const m = manifest();

  it("is installable as a standalone app", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.name).toBe("ASCEND");
    expect(m.theme_color).toBeTruthy();
    expect(m.background_color).toBeTruthy();
  });

  it("ships 192px, 512px and maskable icons that exist on disk", () => {
    const icons = m.icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      expect(existsSync(join(__dirname, "..", "..", "public", icon.src))).toBe(true);
    }
  });
});
