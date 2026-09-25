"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { cx } from "@/lib/cx";
import { NAV_ITEMS, isActiveItem } from "./nav-items";
import styles from "./BottomNav.module.css";

/**
 * Bottom navigation (V2 §4). `active` overrides the route match (design
 * samples only). Active: gold icon, gold label, a lit bar above —
 * never colour alone. ASCEND sits in the centre on a raised gate plate,
 * larger than the rest but not a floating button.
 */
export function BottomNav({ active }: { active?: string } = {}) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.inner}>
        {NAV_ITEMS.map((item) => {
          const current = active ? item.href === active : isActiveItem(pathname, item);
          return (
            <li key={item.href} className={styles.cell}>
              <Link
                href={item.href}
                className={cx(styles.item, item.primary && styles.primary)}
                aria-current={current ? "page" : undefined}
              >
                <span className={styles.well}>
                  {item.primary ? <PixelIcon name="ascend-mark" size={32} /> : <PixelIcon name={item.icon} size={24} />}
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
