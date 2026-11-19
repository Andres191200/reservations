"use client";

import { ErrorScreen } from "../../../error-screen";
import styles from "../../public-page.module.scss";

/** The page of the Cancellation link failed. */
export default function ReservationPageError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className={`${styles.page} ${styles.errorPage}`}>
      <ErrorScreen
        error={error}
        retry={retry}
        title="No pudimos cargar tu Reserva"
        message="Puede ser un problema momentáneo. Probá de nuevo en un rato con el mismo link."
      />
    </main>
  );
}
