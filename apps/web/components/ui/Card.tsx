import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** `raised` adds the only shadow in the system (spec §32). */
  variant?: "default" | "raised" | "subtle";
  as?: ElementType;
  children: ReactNode;
}

export function Card({
  variant = "default",
  as: Component = "div",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Component
      className={cx(styles.card, variant !== "default" && styles[variant], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
