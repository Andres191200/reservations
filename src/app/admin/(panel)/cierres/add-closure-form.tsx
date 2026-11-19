"use client";

import Link from "next/link";
import { useActionState } from "react";
import styles from "../../admin.module.scss";
import { FormFeedback } from "../../form-feedback";
import { addClosure, type AddClosureState } from "./actions";

export function AddClosureForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<AddClosureState, FormData>(addClosure, {});

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        Día
        <input name="day" type="date" min={today} required />
      </label>
      <FormFeedback error={state.error} />
      {state.added && (
        <p role="status" className={state.conflicts ? styles.error : styles.success}>
          {state.conflicts ? (
            <>
              Cierre cargado. Ese día hay{" "}
              {state.conflicts === 1
                ? "1 Reserva Confirmada"
                : `${state.conflicts} Reservas Confirmadas`}
              : <Link href="/admin/conflictos">revisá las Reservas en conflicto</Link>.
            </>
          ) : (
            "Cierre cargado. Ese día no tenía Reservas."
          )}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Cargando…" : "Cargar Cierre"}
      </button>
    </form>
  );
}
