"use client";

import { useState, useTransition } from "react";
import type { Professional } from "@/core/professionals";
import styles from "../admin.module.scss";
import { Modal } from "../modal";
import { reassignReservation } from "./reservas/actions";

/**
 * Reassignment of a Confirmed Reservation to another Professional free at its time,
 * chosen in a modal. The texts come already formatted from the server, in Argentina time.
 */
export function ReassignButton({
  reservationId,
  customerName,
  when,
  professionalName,
  options,
}: {
  reservationId: string;
  customerName: string;
  /** Day and time of the Reservation, as the Admin reads them. */
  when: string;
  professionalName: string;
  /** The active Professionals free at its time, other than its own. */
  options: Professional[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const show = () => {
    setError(undefined);
    setOpen(true);
  };
  // While the Reassignment is in flight the modal stays open.
  const close = () => {
    if (!pending) setOpen(false);
  };
  // On success the row stays (with the new Professional), so the modal is closed here.
  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await reassignReservation({}, formData);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <>
      <button type="button" className={styles.secondaryButton} onClick={show}>
        Reasignar
      </button>
      <Modal open={open} onClose={close} title={`Reasignar la Reserva de ${customerName}`}>
        <p>
          {when}, asignada a {professionalName}.
        </p>
        {options.length === 0 ? (
          <>
            <p className={styles.notice}>No hay otro Profesional libre en ese horario.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={close} autoFocus>
                Volver
              </button>
            </div>
          </>
        ) : (
          <form action={submit} className={styles.modalForm}>
            <input type="hidden" name="reservationId" value={reservationId} />
            <label className={styles.field}>
              <span>Nuevo Profesional</span>
              <select name="professionalId" defaultValue={options[0].id} autoFocus>
                {options.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>
                Solo aparecen los Profesionales libres en ese horario. El horario no cambia y
                al Cliente no se le avisa.
              </span>
            </label>
            <div className={styles.modalActions}>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={close}
                disabled={pending}
              >
                Volver
              </button>
              <button type="submit" className={styles.button} disabled={pending}>
                {pending ? "Reasignando…" : "Reasignar"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
