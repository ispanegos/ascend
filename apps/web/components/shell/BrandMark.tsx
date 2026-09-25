import styles from "./BrandMark.module.css";

/**
 * ASCEND wordmark: a rising line, not a mountain (spec §27).
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.glyph}>
        <rect width="32" height="32" rx="9" fill="var(--color-brand)" />
        <path
          d="M7.5 22.5 13 16l4 3.5 7.5-9"
          fill="none"
          stroke="var(--color-on-brand)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.word}>ASCEND</span>
    </span>
  );
}
