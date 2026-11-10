"use client";

import { useActionState } from "react";
import styles from "../../admin.module.scss";
import {
  saveReservationRules,
  type ReservationRulesFields,
  type ReservationRulesState,
} from "./actions";
import { FormFeedback } from "./opening-hours-form";

const FIELDS: { name: keyof ReservationRulesFields; label: string; hint: string; min: number }[] = [
  {
    name: "reservationDurationMinutes",
    label: "Duración de Reserva (minutos)",
    hint: "Tiempo que ocupa cada Reserva. Divide el Horario de atención en bloques desde la apertura.",
    min: 5,
  },
  {
    name: "minimumNoticeHours",
    label: "Antelación mínima (horas)",
    hint: "Cuánto tiempo antes, como mínimo, se puede reservar un horario.",
    min: 0,
  },
  {
    name: "maximumNoticeDays",
    label: "Antelación máxima (días)",
    hint: "Hasta cuántos días hacia adelante se puede reservar.",
    min: 1,
  },
  {
    name: "cancellationDeadlineHours",
    label: "Límite de cancelación (horas)",
    hint: "Hasta cuánto antes de la Reserva puede cancelarla el Cliente por su cuenta.",
    min: 0,
  },
];

export function ReservationRulesForm({ initialFields }: { initialFields: ReservationRulesFields }) {
  const [state, action, pending] = useActionState<ReservationRulesState, FormData>(
    saveReservationRules,
    {},
  );
  const fields = state.fields ?? initialFields;

  return (
    <form action={action} className={styles.form}>
      {FIELDS.map(({ name, label, hint, min }) => (
        <label key={name} className={styles.field}>
          {label}
          <input
            type="number"
            name={name}
            min={min}
            step={1}
            required
            inputMode="numeric"
            defaultValue={fields[name]}
          />
          <span className={styles.hint}>{hint}</span>
        </label>
      ))}
      <FormFeedback error={state.error} saved={state.saved} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Guardando…" : "Guardar Reglas de Reserva"}
      </button>
    </form>
  );
}
