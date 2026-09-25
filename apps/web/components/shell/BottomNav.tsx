"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { cx } from "@/lib/cx";
import { NAV_ITEMS, isActiveHref } from "./nav-items";
import styles from "./BottomNav.module.css";

/**
 * Bottom navigation (V2 §4). Active: gold icon, gold label, a lit bar above —
 * never colour alone. ASCEND sits in the centre on a raised gate plate,
 * larger than the rest but not a floating button.
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
                  <PixelIcon name={item.icon} size={item.primary ? 28 : 24} />
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
