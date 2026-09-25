import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "..", "..");
const tokensCss = readFileSync(join(webRoot, "styles", "tokens.css"), "utf8");

/** A palette primitive's hex value (Design System V2 §5). */
function palette(name: string): string {
  const match = tokensCss.match(new RegExp(`--ascend-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Token --ascend-${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("Design System V2 tokens", () => {
  it.each([
    "bg-deep",
    "bg",
    "surface-1",
    "surface-2",
    "surface-3",
    "border",
    "text",
    "text-secondary",
    "text-muted",
    "gold",
    "gold-bright",
    "gold-dark",
    "cyan",
    "teal",
    "green",
    "orange",
    "red",
    "boss-bg",
    "boss-red",
    "boss-orange",
    "cream",
  ])("defines the palette colour --ascend-%s", (name) => {
    expect(() => palette(name)).not.toThrow();
  });

  it.each([
    "bg-app",
    "bg-surface",
    "bg-elevated",
    "text-primary",
    "text-secondary",
    "border-default",
    "accent-primary",
    "accent-data",
    "accent-success",
    "accent-danger",
    "status-unranked",
    "status-provisional",
    "status-verified",
    "radius-sm",
    "radius-md",
    "radius-lg",
    "space-4",
    "duration-fast",
    "content-max",
    "mobile-gutter",
    "bottom-nav-height",
    "font-product",
    "font-fantasy",
  ])("defines the semantic token --%s", (name) => {
    expect(tokensCss).toMatch(new RegExp(`--${name}:`));
  });

  it("keeps corners architectural (≤ 16px, V2 §11)", () => {
    for (const match of tokensCss.matchAll(/--radius-(xs|sm|md|lg):\s*(\d+)px/g)) {
      expect(Number(match[2])).toBeLessThanOrEqual(16);
    }
  });
});

describe("text contrast meets WCAG AA 4.5:1 on every dark surface (V2 §27)", () => {
  const surfaces = ["bg-deep", "bg", "surface-1", "surface-2", "surface-3", "boss-bg"];
  const text = ["text", "text-secondary", "text-muted", "gold", "gold-bright", "cyan", "teal", "green", "orange", "red-text", "cream"];

  for (const fg of text) {
    for (const bg of surfaces) {
      it(`--ascend-${fg} on --ascend-${bg}`, () => {
        expect(contrast(palette(fg), palette(bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("dark text on gold (skip link, selected chips)", () => {
    expect(contrast(palette("ink-on-gold"), palette("gold"))).toBeGreaterThanOrEqual(4.5);
  });

  it("cream on the primary button's darkest amber", () => {
    expect(contrast(palette("cream"), palette("amber-deep"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("components consume semantic tokens only", () => {
  function cssModules(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return cssModules(path);
      return entry.endsWith(".module.css") ? [path] : [];
    });
  }

  const files = [
    ...cssModules(join(webRoot, "components")),
    ...cssModules(join(webRoot, "app")),
    ...cssModules(join(webRoot, "features")),
  ];

  it("finds component stylesheets", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((file) => [file.replace(webRoot, ""), file]))("%s has no raw hex colours", (_label, file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it.each(files.map((file) => [file.replace(webRoot, ""), file]))("%s uses no legacy V1 tokens", (_label, file) => {
    expect(readFileSync(file, "utf8")).not.toMatch(/--color-(bg|surface|ink|brand)/);
  });
});
