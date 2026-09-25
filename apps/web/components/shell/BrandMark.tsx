import { PixelIcon } from "@/components/ui/PixelIcon";
import styles from "./BrandMark.module.css";

/**
 * ASCEND wordmark (V2 §7): the gate rune and the name in the fantasy display
 * face. A gate, not a mountain.
 */
export function BrandMark({ size = "md", tagline = false }: { size?: "md" | "lg" | "xl"; tagline?: boolean }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`}>
      <span className={styles.row}>
        <PixelIcon name="ascend" size={size === "md" ? 24 : 32} className={styles.glyph} />
        <span className={styles.word}>ASCEND</span>
      </span>
      {tagline ? <span className={styles.tagline}>Real progress. Real you.</span> : null}
    </span>
  );
}
