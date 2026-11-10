"use client";

import { useActionState, useState } from "react";
import styles from "../../admin.module.scss";
import { Modal } from "../../modal";
import { deactivateProfessional, type DeactivateProfessionalState } from "./actions";

/** Deactivation of one Professional, after the Admin confirms it in a modal. */
export function DeactivateButton({ professionalId, name }: { professionalId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeactivateProfessionalState, FormData>(
    deactivateProfessional,
    {},
  );

  // While the Deactivation is in flight the modal stays open; on success the row
  // disappears from the list, and the modal with it.
  const close = () => {
    if (!pending) setOpen(false);
  };

  return (
    <>
      <button type="button" className={styles.secondaryButton} onClick={() => setOpen(true)}>
        Dar de baja
      </button>
      <Modal open={open} onClose={close} title={`¿Dar de baja a ${name}?`}>
        <p className={styles.muted}>
          Va a dejar de recibir Reservas y no va a aparecer más en el listado. Las Reservas que
          ya atendió se conservan.
        </p>
        <form action={action} className={styles.modalActions}>
          <input type="hidden" name="professionalId" value={professionalId} />
          {state.error && (
            <p role="alert" className={styles.error}>
              {state.error}
            </p>
          )}
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={close}
            disabled={pending}
            // The safe option gets the focus when the modal opens.
            autoFocus
          >
            Cancelar
          </button>
          <button type="submit" className={styles.dangerButton} disabled={pending}>
            {pending ? "Dando de baja…" : "Dar de baja"}
          </button>
        </form>
      </Modal>
    </>
  );
}
