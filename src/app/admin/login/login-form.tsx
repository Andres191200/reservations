"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";
import styles from "../admin.module.scss";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={action} className={styles.form}>
      <label className={styles.field}>
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </label>
      <label className={styles.field}>
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
