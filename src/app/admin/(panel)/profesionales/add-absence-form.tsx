"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Professional } from "@/core/professionals";
import styles from "../../admin.module.scss";
import { FormFeedback } from "../../form-feedback";
import { addAbsence, type AddAbsenceState } from "./actions";

export function AddAbsenceForm({
  professionals,
  today,
}: {
  professionals: Professional[];
  today: string;
}) {
  const [state, action, pending] = useActionState<AddAbsenceState, FormData>(addAbsence, {});
  const { added } = state;

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        Profesional
        <select name="professionalId" required>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Desde
        <input name="startsOn" type="date" min={today} required />
      </label>
      <label className={styles.field}>
        Hasta (incluido)
        <input name="endsOn" type="date" min={today} required />
      </label>
      <FormFeedback error={state.error} />
      {added && (
        <p role="status" className={added.conflicts ? styles.error : styles.success}>
          Ausencia de {added.professionalName} cargada {added.days}.{" "}
          {added.conflicts ? (
            <>
              Tenía{" "}
              {added.conflicts === 1
                ? "1 Reserva Confirmada"
                : `${added.conflicts} Reservas Confirmadas`}{" "}
              esos días: <Link href="/admin/conflictos">reasignalas o cancelalas</Link>.
            </>
          ) : (
            "No tenía Reservas esos días."
          )}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Cargando…" : "Cargar Ausencia"}
      </button>
    </form>
  );
}
