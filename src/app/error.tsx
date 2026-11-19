"use client";

import { ErrorScreen } from "./error-screen";
import styles from "./error-screen.module.scss";

/** Any other page failed (for example, the login). */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className={styles.page}>
      <ErrorScreen
        error={error}
        retry={retry}
        title="Algo falló"
        message="No pudimos cargar esta página. Probá de nuevo en un rato."
      />
    </main>
  );
}
