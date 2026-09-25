import type { ReactNode, SVGProps } from "react";

/*
 * Inline SVG icon set (spec §42: icons as SVG). 24px grid, 1.75 stroke,
 * currentColor. Icons are decorative by default; pass `title` to give one an
 * accessible name.
 */

export type IconName =
  | "today"
  | "stats"
  | "ascend"
  | "boss"
  | "profile"
  | "check"
  | "close"
  | "alert"
  | "offline"
  | "chevron-right";

const PATHS: Record<IconName, ReactNode> = {
  // Sun-less "today": a calendar day with a marker.
  today: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <circle cx="12" cy="14.75" r="1.75" fill="currentColor" stroke="none" />
    </>
  ),
  // Measurement bars.
  stats: <path d="M5 20V13M10 20V8M15 20v-6M20 20V4M3 20.5h18" />,
  // Rising trajectory — spec §27 core metaphor, not a mountain.
  ascend: (
    <>
      <path d="M3.5 18.5 9 13l4 3.5 7.5-8.5" />
      <path d="M15 8h5.5v5.5" />
    </>
  ),
  // Concentric rings: a standardised challenge target.
  boss: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.75" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.25" r="3.75" />
      <path d="M4.5 20c.9-3.6 3.9-5.75 7.5-5.75s6.6 2.15 7.5 5.75" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.25" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  offline: (
    <>
      <path d="M2.5 8.5a14 14 0 0 1 19 0M5.5 12a9.5 9.5 0 0 1 13 0M8.75 15.5a5 5 0 0 1 6.5 0" />
      <path d="M3 3l18 18" />
    </>
  ),
  "chevron-right": <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  name: IconName;
  size?: number;
  title?: string;
}

export function Icon({ name, size = 24, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
