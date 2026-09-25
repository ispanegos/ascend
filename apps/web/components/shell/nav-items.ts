import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** The central primary destination (spec §25). */
  primary?: boolean;
}

/** Primary mobile navigation — 5 destinations maximum (spec §25). */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/ascend", label: "Ascend", icon: "ascend", primary: true },
  { href: "/bosses", label: "Bosses", icon: "boss" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

/** A destination is active on its own route and any nested route. */
export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
