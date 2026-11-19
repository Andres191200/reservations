"use client";

import { ErrorScreen } from "../error-screen";
import styles from "./public-page.module.scss";

/** The public page of a Business failed (for example, the database is down). */
export default function PublicPageError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className={`${styles.page} ${styles.errorPage}`}>
      <ErrorScreen
        error={error}
        retry={retry}
        title="No pudimos cargar los Horarios disponibles"
        message="Puede ser un problema momentáneo. Probá de nuevo en un rato."
      />
    </main>
  );
}
