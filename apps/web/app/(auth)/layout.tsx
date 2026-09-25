import type { ReactNode } from "react";
import { BrandMark } from "@/components/shell/BrandMark";
import styles from "./auth.module.css";

/** Focused layout without the app shell (spec §25). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`app-page app-page--focused ${styles.page}`}>
      <header className={styles.brand}>
        <BrandMark />
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
