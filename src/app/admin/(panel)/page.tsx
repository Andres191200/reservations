import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "../admin.module.scss";
import { getSessionBusiness } from "../session";

export const metadata: Metadata = { title: "Panel · Reservas" };

export default function PanelPage() {
  return (
    <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const business = await getSessionBusiness();
  return (
    <>
      <h1>Panel de {business.name}</h1>
      <p className={styles.muted}>Página pública: /{business.path}</p>
    </>
  );
}
