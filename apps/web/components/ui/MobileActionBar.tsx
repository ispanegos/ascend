import type { ReactNode } from "react";
import styles from "./MobileActionBar.module.css";

/**
 * Sticky bottom action area for linear flows (spec §26, §33). Keeps the
 * primary CTA in the thumb zone. Because it is `position: sticky` inside the
 * document flow, it reserves its own space and never covers content.
 */
export function MobileActionBar({ children, aboveNav = false }: { children: ReactNode; aboveNav?: boolean }) {
  return <div className={aboveNav ? `${styles.bar} ${styles.aboveNav}` : styles.bar}>{children}</div>;
}
