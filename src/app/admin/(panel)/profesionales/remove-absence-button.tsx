"use client";

import { useActionState } from "react";
import styles from "../../admin.module.scss";
import { removeAbsence, type RemoveAbsenceState } from "./actions";

/** Removal of an Absence: the Professional serves those days again. */
export function RemoveAbsenceButton({ absenceId, label }: { absenceId: string; label: string }) {
  const [state, action, pending] = useActionState<RemoveAbsenceState, FormData>(
    removeAbsence,
    {},
  );

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="absenceId" value={absenceId} />
      {state.error && (
        <span role="alert" className={styles.error}>
          {state.error}
        </span>
      )}
      <button
        type="submit"
        className={styles.secondaryButton}
        disabled={pending}
        aria-label={`Eliminar la Ausencia de ${label}`}
      >
        {pending ? "Eliminando…" : "Eliminar"}
      </button>
    </form>
  );
}
