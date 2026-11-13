import styles from "../../public-page.module.scss";

/** Shown for a Cancellation link whose token does not exist, or belongs to another Business. */
export default function ReservationNotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Reserva no encontrada</h1>
        <p className={styles.muted}>
          No encontramos ninguna Reserva con este link. Revisá que sea el mismo que te llegó por
          email.
        </p>
      </section>
    </main>
  );
}
