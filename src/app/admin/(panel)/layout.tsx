import { Suspense } from "react";
import { cerrarSesion } from "../acciones";
import styles from "../admin.module.scss";
import { obtenerNegocioDeLaSesion } from "../sesion";

/** Marco de todas las páginas del panel: nombre del Negocio y botón para cerrar sesión. */
export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className={styles.barra}>
        <Suspense fallback={<span className={styles.apagado}>Cargando…</span>}>
          <NombreDelNegocio />
        </Suspense>
        <form action={cerrarSesion}>
          <button type="submit" className={styles.botonSecundario}>
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className={styles.contenido}>{children}</main>
    </>
  );
}

async function NombreDelNegocio() {
  const negocio = await obtenerNegocioDeLaSesion();
  return <span className={styles.nombreNegocio}>{negocio.nombre}</span>;
}
