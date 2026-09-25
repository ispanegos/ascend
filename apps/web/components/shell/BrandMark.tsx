import { PixelIcon } from "@/components/ui/PixelIcon";
import styles from "./BrandMark.module.css";

/**
 * ASCEND identity (V2 §9): an ancient gate with a keystone and light rising
 * through it, and the name in the fantasy face. A gate, not a mountain. Used
 * sparingly: sign-in, sign-up, offline.
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" | "xl" }) {
  const glyph = size === "md" ? 32 : size === "lg" ? 40 : 64;
  return (
    <span className={`${styles.mark} ${styles[size]}`}>
      <PixelIcon name="ascend-mark" size={glyph} className={styles.glyph} />
      <span className={styles.word}>ASCEND</span>
    </span>
  );
}
