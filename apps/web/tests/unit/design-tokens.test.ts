import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(__dirname, "..", "..");
const tokensCss = readFileSync(join(webRoot, "styles", "tokens.css"), "utf8");

function token(name: string): string {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Token --${name} not found`);
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

describe("design tokens (spec §28)", () => {
  it.each([
    "color-bg",
    "color-surface",
    "color-surface-raised",
    "color-surface-subtle",
    "color-ink",
    "color-ink-strong",
    "color-ink-muted",
    "color-ink-faint",
    "color-brand",
    "color-brand-strong",
    "color-brand-soft",
    "color-success",
    "color-warning",
    "color-danger",
    "color-info",
    "color-boss-bg",
    "color-boss-surface",
    "color-boss-ink",
    "color-boss-muted",
  ])("defines --%s", (name) => {
    expect(() => token(name)).not.toThrow();
  });

  it.each([
    "radius-lg",
    "space-4",
    "shadow-sm",
    "duration-fast",
    "ease-standard",
    "page-max",
    "mobile-gutter",
    "bottom-nav-height",
    "font-sans",
  ])("defines --%s", (name) => {
    expect(tokensCss).toMatch(new RegExp(`--${name}:`));
  });
});

describe("text contrast meets WCAG AA 4.5:1 (spec §40, ADR-009)", () => {
  const lightSurfaces = ["color-bg", "color-surface", "color-surface-raised", "color-surface-subtle"];
  const textTokens = [
    "color-ink",
    "color-ink-muted",
    "color-brand",
    "color-success",
    "color-warning",
    "color-danger",
    "color-info",
  ];

  for (const text of textTokens) {
    for (const surface of lightSurfaces) {
      it(`${text} on ${surface}`, () => {
        expect(contrast(token(text), token(surface))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it.each([
    ["color-on-brand", "color-brand"],
    ["color-brand-strong", "color-brand-soft"],
    ["color-ink-muted", "color-brand-soft"],
    ["color-boss-ink", "color-boss-bg"],
    ["color-boss-muted", "color-boss-bg"],
    ["color-boss-muted", "color-boss-surface"],
  ])("%s on %s", (text, surface) => {
    expect(contrast(token(text), token(surface))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("components consume semantic tokens only (spec §28)", () => {
  function cssModules(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return cssModules(path);
      return entry.endsWith(".module.css") ? [path] : [];
    });
  }

  const files = [...cssModules(join(webRoot, "components")), ...cssModules(join(webRoot, "app"))];

  it("finds component stylesheets", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((file) => [file.replace(webRoot, ""), file]))(
    "%s has no raw hex colours",
    (_label, file) => {
      expect(readFileSync(file, "utf8")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    },
  );
});
