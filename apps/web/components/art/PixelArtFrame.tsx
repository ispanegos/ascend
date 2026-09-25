import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./PixelArtFrame.module.css";

/**
 * A stepped pixel border around art (V2 §8, §25): corners notched like a
 * sprite frame, tone set by context. Decorative.
 */
export function PixelArtFrame({
  tone = "default",
  className,
  children,
}: {
  tone?: "default" | "gold" | "boss" | "data";
  className?: string | undefined;
  children: ReactNode;
}) {
  return <div className={cx(styles.frame, styles[tone], className)}>{children}</div>;
}
