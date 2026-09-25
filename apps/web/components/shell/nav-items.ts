import type { PixelIconName } from "@/components/ui/PixelIcon";

export interface NavItem {
  href: string;
  label: string;
  icon: PixelIconName;
  /** The central primary destination. */
  primary?: boolean;
  /** Other routes that belong to this destination. */
  also?: readonly string[];
}

/** Primary navigation (Design System V2 §4): Today · Quests · ASCEND · Stats · You. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/quests", label: "Quests", icon: "quest" },
  // Boss encounters live inside the Ascend progression (V2 pass 2 §12).
  { href: "/ascend", label: "Ascend", icon: "ascend", primary: true, also: ["/bosses"] },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/profile", label: "You", icon: "you" },
];

/** A destination is active on its own route and any nested route. */
export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isActiveItem(pathname: string, item: NavItem): boolean {
  return [item.href, ...(item.also ?? [])].some((href) => isActiveHref(pathname, href));
}
