import type { Metadata } from "next";
import styles from "../admin.module.scss";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar al panel · Reservas" };

export default function LoginPage() {
  return (
    <main className={styles.centered}>
      <div className={styles.card}>
        <h1>Ingresar al panel</h1>
        <LoginForm />
      </div>
    </main>
  );
}
