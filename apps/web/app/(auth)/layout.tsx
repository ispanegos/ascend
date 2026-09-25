import type { ReactNode } from "react";
import { Artwork } from "@/components/art/Artwork";
import { BrandMark } from "@/components/shell/BrandMark";
import styles from "./auth.module.css";

/**
 * Focused layout without the app shell. The one screen where the wordmark
 * leads: a band of world art, then straight to the form (V2 §29).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`app-page app-page--focused ${styles.page}`}>
      <header className={styles.brand}>
        <Artwork id="world.dusk-ruins" ratio="2 / 1" priority scrim="bottom" className={styles.art} />
        <div className={styles.wordmark}>
          <BrandMark size="xl" tagline />
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
