"use client";

import { useActionState, useState } from "react";
import styles from "../admin.module.scss";
import { Modal } from "../modal";
import { cancelReservation, type CancelReservationState } from "./reservas/actions";

/**
 * Cancellation of a Confirmed Reservation by the Business, after the Admin confirms it in
 * a modal. The texts come already formatted from the server, in Argentina time.
 */
export function CancelReservationButton({
  reservationId,
  customerName,
  customerEmail,
  when,
  professionalName,
}: {
  reservationId: string;
  customerName: string;
  customerEmail: string | null;
  /** Day and time of the Reservation, as the Admin reads them. */
  when: string;
  professionalName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CancelReservationState, FormData>(
    cancelReservation,
    {},
  );

  // While the Cancellation is in flight the modal stays open; once done, the row shows
  // the Reservation as Cancelled, without this button, and the modal goes with it.
  const close = () => {
    if (!pending) setOpen(false);
  };

  return (
    <>
      <button type="button" className={styles.secondaryButton} onClick={() => setOpen(true)}>
        Cancelar
      </button>
      <Modal open={open} onClose={close} title={`¿Cancelar la Reserva de ${customerName}?`}>
        <p>
          {when}, con {professionalName}.
        </p>
        <p className={styles.muted}>
          El horario vuelve a quedar disponible y la Reserva no se puede reactivar.{" "}
          {customerEmail
            ? `Le vamos a avisar por email a ${customerEmail}.`
            : "No dejó email: avisale por otro medio."}
        </p>
        <form action={action} className={styles.modalActions}>
          <input type="hidden" name="reservationId" value={reservationId} />
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
            Volver
          </button>
          <button type="submit" className={styles.dangerButton} disabled={pending}>
            {pending ? "Cancelando…" : "Cancelar Reserva"}
          </button>
        </form>
      </Modal>
    </>
  );
}
