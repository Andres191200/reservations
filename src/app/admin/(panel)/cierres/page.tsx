import type { Metadata } from "next";
import { Suspense } from "react";
import { getUpcomingClosures } from "@/core/closures";
import { capitalize, formatDay } from "@/core/format";
import { dayInTimeZone } from "@/core/time-zone";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { AddClosureForm } from "./add-closure-form";
import { RemoveClosureButton } from "./remove-closure-button";

export const metadata: Metadata = { title: "Cierres · Reservas" };

/** The Closures of the Business: specific days it does not open, like a holiday. */
export default function ClosuresPage() {
  return (
    <>
      <h1>Cierres</h1>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h2>Próximos Cierres</h2>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <UpcomingClosures />
          </Suspense>
        </section>
        <section className={styles.section}>
          <h2>Cargar Cierre</h2>
          <p className={styles.muted}>
            Un día puntual en que el Negocio no atiende, por ejemplo un feriado. Ese día no se
            ofrecen Horarios disponibles. Las Reservas que ya había quedan en conflicto, para
            que las canceles.
          </p>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <AddClosure />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function AddClosure() {
  // Reading the session first makes the page dynamic, so "today" is today's.
  await getSessionBusiness();
  return <AddClosureForm today={dayInTimeZone(new Date())} />;
}

async function UpcomingClosures() {
  const business = await getSessionBusiness();
  const closures = await getUpcomingClosures(business.id, new Date());

  if (closures.length === 0) {
    return <p className={styles.muted}>No hay Cierres cargados.</p>;
  }

  return (
    <ul className={styles.list}>
      {closures.map((closure) => (
        <li key={closure.id} className={styles.listRow}>
          <span>{capitalize(formatDay(closure.day))}</span>
          <RemoveClosureButton closureId={closure.id} day={formatDay(closure.day)} />
        </li>
      ))}
    </ul>
  );
}
