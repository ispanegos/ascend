import type { SVGProps } from "react";
import { PIXEL_ICONS, type PixelIconName } from "./pixel-icons";

export type { PixelIconName } from "./pixel-icons";

type Tone = "o" | "f" | "h";

/** One path per tone: each horizontal run of pixels becomes a rectangle. */
function toPaths(rows: readonly string[]): Record<Tone, string> {
  const paths: Record<Tone, string> = { o: "", f: "", h: "" };
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

const CACHE = new Map<PixelIconName, Record<Tone, string>>();

function pathsFor(name: PixelIconName) {
  let paths = CACHE.get(name);
  if (!paths) {
    paths = toPaths(PIXEL_ICONS[name]);
    CACHE.set(name, paths);
  }
  return paths;
}

interface PixelIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  name: PixelIconName;
  /** CSS pixels. Multiples of 16 render the crispest pixels. */
  size?: number;
  /** Gives the icon an accessible name; otherwise it is decorative. */
  title?: string;
}

/**
 * Pixel-art identity icon (Design System V2 §10). Colour comes from
 * `currentColor`; the highlight tone from `--pixel-highlight`.
 */
export function PixelIcon({ name, size = 24, title, style, ...rest }: PixelIconProps) {
  const paths = pathsFor(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      style={{ flex: "none", ...style }}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {paths.f ? <path d={paths.f} fill="currentColor" fillOpacity={0.42} /> : null}
      {paths.o ? <path d={paths.o} fill="currentColor" /> : null}
      {paths.h ? <path d={paths.h} fill="var(--pixel-highlight, var(--text-display))" fillOpacity={0.92} /> : null}
    </svg>
  );
}
