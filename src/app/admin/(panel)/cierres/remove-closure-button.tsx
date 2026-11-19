"use client";

import { useActionState } from "react";
import styles from "../../admin.module.scss";
import { removeClosure, type RemoveClosureState } from "./actions";

/** Removal of a Closure: the day offers Available slots again. */
export function RemoveClosureButton({ closureId, day }: { closureId: string; day: string }) {
  const [state, action, pending] = useActionState<RemoveClosureState, FormData>(
    removeClosure,
    {},
  );

  return (
    <form action={action} className={styles.inlineForm}>
      <input type="hidden" name="closureId" value={closureId} />
      {state.error && (
        <span role="alert" className={styles.error}>
          {state.error}
        </span>
      )}
      <button
        type="submit"
        className={styles.secondaryButton}
        disabled={pending}
        aria-label={`Eliminar el Cierre del ${day}`}
      >
        {pending ? "Eliminando…" : "Eliminar"}
      </button>
    </form>
  );
}
