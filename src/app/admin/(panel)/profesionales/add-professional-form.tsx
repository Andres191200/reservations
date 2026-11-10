"use client";

import { useActionState } from "react";
import styles from "../../admin.module.scss";
import { FormFeedback } from "../../form-feedback";
import { addProfessional, type AddProfessionalState } from "./actions";

export function AddProfessionalForm() {
  const [state, action, pending] = useActionState<AddProfessionalState, FormData>(
    addProfessional,
    {},
  );

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        Nombre
        <input
          name="name"
          required
          maxLength={100}
          autoComplete="off"
          // After a rejection the form is reset, so the typed name comes back from the state.
          defaultValue={state.name}
        />
      </label>
      <FormFeedback
        error={state.error}
        saved={state.added !== undefined}
        savedMessage={`${state.added} ya es parte del equipo.`}
      />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Agregando…" : "Agregar Profesional"}
      </button>
    </form>
  );
}
