import styles from "./public-page.module.scss";

/** Shown when no Business has the path of the URL. */
export default function BusinessNotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Negocio no encontrado</h1>
        <p className={styles.muted}>
          No hay ningún Negocio en esta dirección. Revisá que el link esté bien escrito.
        </p>
      </section>
    </main>
  );
}
