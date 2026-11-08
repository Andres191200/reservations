import type { Metadata } from "next";
import styles from "../admin.module.scss";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Ingresar al panel · Reservas" };

export default function PaginaLogin() {
  return (
    <main className={styles.centrado}>
      <div className={styles.tarjeta}>
        <h1>Ingresar al panel</h1>
        <FormularioLogin />
      </div>
    </main>
  );
}
