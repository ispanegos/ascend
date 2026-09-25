"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { Icon } from "@/components/ui/Icon";
import { NAV_ITEMS, isActiveHref } from "./nav-items";
import styles from "./BottomNav.module.css";

/**
 * Bottom navigation (spec §25, §26, §34). The active destination is marked by
 * `aria-current`, an indicator bar, a filled icon well and heavier label —
 * never colour alone.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.inner}>
        {NAV_ITEMS.map((item) => {
          const active = isActiveHref(pathname, item.href);
          return (
            <li key={item.href} className={styles.cell}>
              <Link
                href={item.href}
                className={cx(styles.item, item.primary && styles.primary)}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.well}>
                  <Icon name={item.icon} size={22} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
