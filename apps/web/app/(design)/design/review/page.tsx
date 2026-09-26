import type { Metadata } from "next";
import styles from "./review.module.css";

export const metadata: Metadata = { title: "Visual review · Design System V2" };

const FRAMES = [
  ["today", "Today"],
  ["quests", "Quests"],
  ["ascend", "Ascend"],
  ["stats", "Stats"],
  ["boss", "Boss"],
  ["workout", "Active workout"],
  ["you", "You"],
] as const;

/**
 * Six 390 × 844 phone frames side by side (V2 pass 2 §22). Each frame is a
 * real page (/design/sample/*) in an iframe, so it renders at a true phone
 * width with its own fixed navigation. Sample content only.
 */
export default function ReviewPage() {
  return (
    <main id="main" className={styles.page}>
      <header className={styles.header}>
        <h1 className="text-fantasy">ASCEND · Visual review</h1>
        <p className="text-muted">Design System V2 · 390 × 844 · sample content only</p>
      </header>
      <div className={styles.row}>
        {FRAMES.map(([screen, label]) => (
          <figure key={screen} className={styles.figure}>
            <div className={styles.phone}>
              <iframe src={`/design/sample/${screen}`} title={`${label} sample screen`} width={390} height={844} loading="lazy" />
            </div>
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
