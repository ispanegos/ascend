"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Sheet.module.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Bottom sheet for short contextual actions (spec §26). Built on native
 * `<dialog>`, which provides focus containment, `Esc` to close and an inert
 * background (ADR-003). Becomes a centred panel from tablet width.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click landing on the dialog element itself is the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.panel}>
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className="text-h2">
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
