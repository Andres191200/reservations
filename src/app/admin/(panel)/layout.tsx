import { Suspense } from "react";
import { signOut } from "../actions";
import styles from "../admin.module.scss";
import { getSessionBusiness } from "../session";

/** Frame of every panel page: the Business name and the sign-out button. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className={styles.topBar}>
        <Suspense fallback={<span className={styles.muted}>Cargando…</span>}>
          <BusinessName />
        </Suspense>
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
