"use client";

import { useActionState } from "react";
import { WEEKDAYS } from "@/core/weekdays";
import styles from "../../admin.module.scss";
import { saveOpeningHours, type DayFields, type OpeningHoursState } from "./actions";

/** Week of Opening hours: for each day, a range from opening to closing, or closed. */
export function OpeningHoursForm({ initialDays }: { initialDays: DayFields[] }) {
  const [state, action, pending] = useActionState<OpeningHoursState, FormData>(
    saveOpeningHours,
    {},
  );
  const days = state.days ?? initialDays;

  return (
    <form action={action} className={styles.form}>
      <div className={styles.week}>
        {WEEKDAYS.map(({ weekday, name }) => {
          const day = days.find((d) => d.weekday === weekday);
          return (
            <fieldset key={weekday} className={styles.day}>
              <legend className={styles.dayName}>{name}</legend>
              <label className={styles.closedToggle}>
                <input type="checkbox" name={`closed-${weekday}`} defaultChecked={day?.closed} />
                Cerrado
              </label>
              <div className={styles.dayTimes}>
                <label className={styles.field}>
                  Apertura
                  <input
                    type="time"
                    name={`opensAt-${weekday}`}
                    defaultValue={day?.opensAt}
                  />
                </label>
                <label className={styles.field}>
                  Cierre
                  <input
                    type="time"
                    name={`closesAt-${weekday}`}
                    defaultValue={day?.closesAt}
                  />
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>
      <FormFeedback error={state.error} saved={state.saved} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Guardando…" : "Guardar Horario de atención"}
      </button>
    </form>
  );
}

export function FormFeedback({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) {
    return (
      <p role="alert" className={styles.error}>
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p role="status" className={styles.success}>
        Cambios guardados.
      </p>
    );
  }
  return null;
}
