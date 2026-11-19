import styles from "./error-screen.module.scss";

/** A 404 for the addresses that do not exist. */
export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.screen}>
        <h1 className={styles.title}>Página no encontrada</h1>
        <p className={styles.message}>
          Esta dirección no existe. Revisá que el link esté bien escrito.
        </p>
      </section>
    </main>
  );
}
