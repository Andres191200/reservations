import Link from "next/link";
import { Suspense } from "react";
import { getConflictingReservations } from "@/core/conflicts";
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
        <form action={signOut}>
          <button type="submit" className={styles.secondaryButton}>
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className={styles.content}>{children}</main>
    </>
  );
}

async function BusinessName() {
  const business = await getSessionBusiness();
  return <span className={styles.businessName}>{business.name}</span>;
}

/** Shown only while there are Conflicting reservations to resolve. */
async function ConflictsLink() {
  const business = await getSessionBusiness();
  const conflicts = await getConflictingReservations(business.id, new Date());
  if (conflicts.length === 0) return null;
  return (
    <Link href="/admin/conflictos" className={styles.conflictsLink}>
      Reservas en conflicto ({conflicts.length})
    </Link>
  );
}
