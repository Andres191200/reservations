import type { Metadata } from "next";
import { Suspense } from "react";
import { getConflictingReservations, type ConflictReason } from "@/core/conflicts";
import { capitalize, formatDay } from "@/core/format";
import { dayInTimeZone, type CalendarDay } from "@/core/time-zone";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { ReservationList } from "../reservation-list";

export const metadata: Metadata = { title: "Reservas en conflicto · Reservas" };

const REASON_LABEL: Record<ConflictReason, string> = {
  closure: "Hay un Cierre ese día: cancelalas para avisarle a cada Cliente.",
};

/**
 * The Conflicting reservations of the Business, by day: Confirmed Reservations that
 * cannot be served as they are, until the Admin resolves them.
 */
export default function ConflictsPage() {
  return (
    <>
      <h1>Reservas en conflicto</h1>
      <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
        <Conflicts />
      </Suspense>
    </>
  );
}

async function Conflicts() {
  const business = await getSessionBusiness();
  const conflicts = await getConflictingReservations(business.id, new Date());

  if (conflicts.length === 0) {
    return <p className={styles.notice}>No hay Reservas en conflicto.</p>;
  }

  const days = new Map<CalendarDay, typeof conflicts>();
  for (const reservation of conflicts) {
    const day = dayInTimeZone(reservation.startsAt);
    days.set(day, [...(days.get(day) ?? []), reservation]);
  }

  return (
    <div className={styles.sections}>
      {[...days].map(([day, reservations]) => (
        <section key={day} className={styles.section}>
          <h2>{capitalize(formatDay(day))}</h2>
          {[...new Set(reservations.map((reservation) => reservation.reason))].map((reason) => (
            <p key={reason} className={styles.muted}>
              {REASON_LABEL[reason]}
            </p>
          ))}
          <ReservationList reservations={reservations} day={day} />
        </section>
      ))}
    </div>
  );
}
