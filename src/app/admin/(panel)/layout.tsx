import Link from "next/link";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { getConflictingReservations } from "@/core/conflicts";
import { ThemeToggle } from "../../theme-toggle";
import { signOut } from "../actions";
import styles from "../admin.module.scss";
import { getSessionBusiness } from "../session";

/** Frame of every panel page: the Business name, the navigation and the sign-out button. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className={styles.topBar}>
        <div className={styles.topBarStart}>
          <Suspense fallback={<span className={styles.muted}>Cargando…</span>}>
            <BusinessName />
          </Suspense>
          <nav className={styles.nav} aria-label="Panel">
            <Link href="/admin">Inicio</Link>
            <Link href="/admin/reservas">Reservas</Link>
            <Link href="/admin/agenda">Agenda</Link>
            <Link href="/admin/profesionales">Profesionales</Link>
            <Link href="/admin/cierres">Cierres</Link>
            <Link href="/admin/configuracion">Configuración</Link>
            <Suspense fallback={null}>
              <ConflictsLink />
            </Suspense>
          </nav>
        </div>
        <div className={styles.topBarEnd}>
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className={styles.secondaryButton}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </>
  );
}

async function BusinessName() {
  let name: string;
  try {
    name = (await getSessionBusiness()).name;
  } catch (error) {
    // The frame stays standing: the page below shows the error.
    unstable_rethrow(error);
    console.error("No se pudo cargar el nombre del Negocio en el panel:", error);
    return null;
  }
  return <span className={styles.businessName}>{name}</span>;
}

/** Shown only while there are Conflicting reservations to resolve. */
async function ConflictsLink() {
  let count: number;
  try {
    const business = await getSessionBusiness();
    count = (await getConflictingReservations(business.id, new Date())).length;
  } catch (error) {
    // The frame stays standing: the page below shows the error.
    unstable_rethrow(error);
    console.error("No se pudieron contar las Reservas en conflicto:", error);
    return null;
  }
  if (count === 0) return null;
  return (
    <Link href="/admin/conflictos" className={styles.conflictsLink}>
      Reservas en conflicto ({count})
    </Link>
  );
}
