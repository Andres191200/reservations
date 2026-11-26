import { MessageScreen } from "./message-screen";
import styles from "./message-screen.module.scss";

/** A 404 for the addresses that do not exist. */
export default function NotFound() {
  return (
    <main className={styles.page}>
      <MessageScreen
        title="Página no encontrada"
        message="Esta dirección no existe. Revisá que el link esté bien escrito."
      />
    </main>
  );
}
