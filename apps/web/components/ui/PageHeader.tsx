import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  /** Small uppercase context label, e.g. the date on Today. */
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Optional trailing element such as a status badge. */
  aside?: ReactNode;
}

/** Page title block. Renders the page's single `h1` (spec §40). */
export function PageHeader({ eyebrow, title, description, aside }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        {eyebrow ? <p className="text-label text-muted">{eyebrow}</p> : null}
        <h1 className="text-h1">{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}
