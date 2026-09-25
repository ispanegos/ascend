import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Card.module.css";

export type CardVariant = "default" | "raised" | "subtle" | "highlight" | "boss" | "data";

interface CardProps extends HTMLAttributes<HTMLElement> {
  /**
   * default   — dark blue-green surface, subtle border
   * raised    — one step lighter
   * subtle    — sunken, borderless
   * highlight — gold edge: the current objective or selected item
   * boss      — red edge: Boss content only
   * data      — cyan edge: live measurements
   */
  variant?: CardVariant;
  as?: ElementType;
  /** Tighter padding for dense lists. */
  dense?: boolean;
  children: ReactNode;
}

/** Design System V2 §11. Architectural: small radius, tonal, barely any shadow. */
export function Card({ variant = "default", as: Component = "div", dense = false, className, children, ...rest }: CardProps) {
  return (
    <Component className={cx(styles.card, variant !== "default" && styles[variant], dense && styles.dense, className)} {...rest}>
      {children}
    </Component>
  );
}
