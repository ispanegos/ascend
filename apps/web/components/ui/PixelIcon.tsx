import type { SVGProps } from "react";
import { PIXEL_ICONS_HD } from "./pixel-icons-hd";
import { PIXEL_ICONS, type PixelIconName } from "./pixel-icons";

export type { PixelIconName } from "./pixel-icons";

/** Includes the brand mark, which exists only at high resolution. */
export type PixelGlyph = PixelIconName | "ascend-mark";

type Tone = "o" | "f" | "s" | "l" | "h";
const TONES: readonly Tone[] = ["o", "f", "s", "l", "h"];

/** One path per tone: each horizontal run of pixels becomes a rectangle. */
function toPaths(rows: readonly string[]): Record<Tone, string> {
  const paths: Record<Tone, string> = { o: "", f: "", s: "", l: "", h: "" };
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const tone = row[x] as Tone | ".";
      let end = x + 1;
      while (end < row.length && row[end] === tone) end++;
      if (tone !== ".") paths[tone] += `M${x} ${y}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  });
  return paths;
}

const CACHE = new Map<string, { size: number; paths: Record<Tone, string> }>();

/**
 * ≥ 20 px: the detailed 24/32-grid sprite (shaded, V2 pass 2). Smaller: the
 * 16-grid glyph, which stays legible at badge size.
 */
function spriteFor(name: PixelGlyph, size: number) {
  const hd = size >= 20 || name === "ascend-mark" ? (PIXEL_ICONS_HD as Record<string, readonly string[]>)[name] : undefined;
  const rows = hd ?? PIXEL_ICONS[name as PixelIconName];
  const key = `${name}:${hd ? "hd" : "sd"}`;
  let sprite = CACHE.get(key);
  if (!sprite) {
    sprite = { size: rows.length, paths: toPaths(rows) };
    CACHE.set(key, sprite);
  }
  return sprite;
}

/** 16-grid tones map onto the same palette: o → base, f → shade, h → glint. */
const SD_FILL: Record<Tone, string> = {
  o: "currentColor",
  f: "var(--pixel-shade)",
  s: "var(--pixel-shade)",
  l: "var(--pixel-light)",
  h: "var(--pixel-glint)",
};

const HD_FILL: Record<Tone, string> = {
  o: "var(--pixel-outline)",
  f: "currentColor",
  s: "var(--pixel-shade)",
  l: "var(--pixel-light)",
  h: "var(--pixel-glint)",
};

interface PixelIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  name: PixelGlyph;
  /** CSS pixels. Multiples of the grid (16, 24, 32…) render the crispest pixels. */
  size?: number;
  /** Gives the icon an accessible name; otherwise it is decorative. */
  title?: string;
}

/**
 * Pixel-art identity icon (Design System V2 §10). Colour comes from
 * `currentColor`; outline, shade and light tones derive from it.
 */
export function PixelIcon({ name, size = 24, title, style, ...rest }: PixelIconProps) {
  const sprite = spriteFor(name, size);
  const fills = sprite.size > 16 ? HD_FILL : SD_FILL;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${sprite.size} ${sprite.size}`}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      style={{ flex: "none", ...style }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {TONES.map((tone) => (sprite.paths[tone] ? <path key={tone} d={sprite.paths[tone]} style={{ fill: fills[tone] }} /> : null))}
    </svg>
  );
}
