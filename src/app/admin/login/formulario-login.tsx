"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "../acciones";
import styles from "../admin.module.scss";

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className={styles.formulario}>
      <label className={styles.campo}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
        />
      </label>
      <label className={styles.campo}>
        Contraseña
        <input name="contrasena" type="password" autoComplete="current-password" required />
      </label>
      {estado.error && (
        <p role="alert" className={styles.error}>
          {estado.error}
        </p>
      )}
      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
