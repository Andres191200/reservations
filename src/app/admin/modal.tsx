"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./admin.module.scss";

/**
 * Modal window of the panel, on top of the native <dialog>: it brings the backdrop, keeps
 * the focus inside while open, closes with Esc and returns the focus to where it was.
 * It is controlled: `open` decides whether it shows, and `onClose` asks to close it
 * (Esc, a click on the backdrop).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
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
      className={styles.modal}
      aria-labelledby={titleId}
      // Esc: the parent decides, so the dialog never closes behind its back.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The dialog has no padding, so a click on itself is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.modalBody}>
        <h2 id={titleId} className={styles.modalTitle}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
