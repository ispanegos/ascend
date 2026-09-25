import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface CommonProps {
  variant?: ButtonVariant;
  /**
   * Full width is the mobile default for primary flows (spec §32). Desktop
   * may shrink to content via `fit="auto"`.
   */
  fit?: "full" | "auto";
  children: ReactNode;
}

function classesFor(variant: ButtonVariant, fit: "full" | "auto", extra?: string) {
  return cx(styles.button, styles[variant], fit === "auto" && styles.auto, extra);
}

export interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Shows a busy state and blocks repeat submission. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  fit = "full",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classesFor(variant, fit, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}

export interface ButtonLinkProps
  extends CommonProps,
    Omit<ComponentProps<typeof Link>, "children"> {}

export function ButtonLink({
  variant = "primary",
  fit = "full",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={classesFor(variant, fit, className)} {...rest}>
      <span className={styles.label}>{children}</span>
    </Link>
  );
}
