import type { PixelIconName } from "@/components/ui/PixelIcon";

export interface NavItem {
  href: string;
  label: string;
  icon: PixelIconName;
  /** The central primary destination. */
  primary?: boolean;
}

/** Primary navigation (Design System V2 §4): Today · Quests · ASCEND · Stats · You. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/quests", label: "Quests", icon: "quest" },
  { href: "/ascend", label: "Ascend", icon: "ascend", primary: true },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/profile", label: "You", icon: "you" },
];

/** A destination is active on its own route and any nested route. */
export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
