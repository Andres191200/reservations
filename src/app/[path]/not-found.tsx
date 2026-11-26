import { MessageScreen } from "../message-screen";
import styles from "./public-page.module.scss";

/** Shown when no Business has the path of the URL. */
export default function BusinessNotFound() {
  return (
    <main className={`${styles.page} ${styles.errorPage}`}>
      <MessageScreen
        title="Negocio no encontrado"
        message="No hay ningún negocio en esta dirección. Revisá que el link esté bien escrito."
      />
    </main>
  );
}
