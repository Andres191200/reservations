import Link from "next/link";
import { MessageScreen } from "../../../message-screen";
import screen from "../../../message-screen.module.scss";
import styles from "../../public-page.module.scss";

/**
 * A Cancellation link whose token does not exist, or belongs to another Business. When the
 * Business of the link exists, the way out is its public page.
 */
export function ReservationNotFound({ business }: { business?: { name: string; path: string } }) {
  return (
    <main className={`${styles.page} ${styles.errorPage}`}>
      <MessageScreen
        title="Reserva no encontrada"
        message="No encontramos ninguna reserva con este link. Revisá que sea el mismo que te llegó por email."
      >
        {business && (
          <Link href={`/${business.path}`} className={screen.primaryAction}>
            Ir a la página de {business.name}
          </Link>
        )}
      </MessageScreen>
    </main>
  );
}
