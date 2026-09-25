import type { ReactNode } from "react";
import styles from "./SectionHeader.module.css";

/** Section label row: "QUESTS OF THE DAY   3/5" (V2 §25). */
export function SectionHeader({
  id,
  title,
  aside,
  as: Heading = "h2",
}: {
  id?: string;
  title: ReactNode;
  aside?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className={styles.row}>
      <Heading id={id} className={styles.title}>
        {title}
      </Heading>
      {aside ? <span className={styles.aside}>{aside}</span> : null}
    </div>
  );
}
