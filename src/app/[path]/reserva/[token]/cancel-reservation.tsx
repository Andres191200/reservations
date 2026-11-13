"use client";

import { useActionState, useState } from "react";
import styles from "../../public-page.module.scss";
import { cancelReservation, type CancelReservationState } from "./actions";

/**
 * The Customer cancels their Reservation, after confirming it: a Cancellation cannot be
 * undone. Once made, the page shows the Reservation as Cancelled and this goes away.
 */
export function CancelReservation(props: {
  path: string;
  token: string;
  cancellableUntil: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<CancelReservationState>(
    cancelReservation.bind(null, props.path, props.token),
    {},
  );

  return (
    <div className={styles.cancellation}>
      <p className={styles.muted}>
        Si no podés ir, podés cancelarla hasta el {props.cancellableUntil}.
      </p>

      {confirming ? (
        <form action={action} className={styles.confirmation}>
          <p>¿Seguro que querés cancelar tu Reserva? No se puede deshacer.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setConfirming(false)}
              disabled={pending}
              // The safe option gets the focus.
              autoFocus
            >
              No, mantenerla
            </button>
            <button type="submit" className={styles.dangerButton} disabled={pending}>
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setConfirming(true)}
        >
          Cancelar Reserva
        </button>
      )}

      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
    </div>
  );
}
