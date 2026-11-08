import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "../admin.module.scss";
import { obtenerNegocioDeLaSesion } from "../sesion";

export const metadata: Metadata = { title: "Panel · Reservas" };

export default function PaginaPanel() {
  return (
    <Suspense fallback={<p className={styles.apagado}>Cargando…</p>}>
      <Bienvenida />
    </Suspense>
  );
}

async function Bienvenida() {
  const negocio = await obtenerNegocioDeLaSesion();
  return (
    <>
      <h1>Panel de {negocio.nombre}</h1>
      <p className={styles.apagado}>Página pública: /{negocio.path}</p>
    </>
  );
}
