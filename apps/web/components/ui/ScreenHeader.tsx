import type { ReactNode } from "react";
import styles from "./ScreenHeader.module.css";

interface ScreenHeaderProps {
  /** Small uppercase context label, e.g. the date on Today. */
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Optional trailing element such as a status badge. */
  aside?: ReactNode;
}

/**
 * Screen title block: condensed uppercase title like a game menu, still the
 * page's single `h1` (V2 §7, §25).
 */
export function ScreenHeader({ eyebrow, title, description, aside }: ScreenHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}
