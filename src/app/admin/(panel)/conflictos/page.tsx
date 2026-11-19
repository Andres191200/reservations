import type { Metadata } from "next";
import { Suspense } from "react";
import { getConflictingReservations, type ConflictReason } from "@/core/conflicts";
import { capitalize, formatDay } from "@/core/format";
import { getReassignmentOptions } from "@/core/reassignments";
import { dayInTimeZone, type CalendarDay } from "@/core/time-zone";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { ReservationList } from "../reservation-list";

export const metadata: Metadata = { title: "Reservas en conflicto · Reservas" };

const REASON_LABEL: Record<ConflictReason, string> = {
  closure: "Hay un Cierre ese día: cancelalas para avisarle a cada Cliente.",
  absence: "Su Profesional tiene una Ausencia ese día: reasignalas o cancelalas.",
  deactivated: "Su Profesional fue dado de baja: reasignalas o cancelalas.",
};

const REASONS: ConflictReason[] = ["closure", "deactivated", "absence"];

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

  // A Closure is not solved by reassigning: only the others get the option.
  const reassignmentOptions = await getReassignmentOptions(
    business.id,
    conflicts.filter((reservation) => reservation.reason !== "closure"),
  );

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
          {REASONS.map((reason) => {
            const withReason = reservations.filter((reservation) => reservation.reason === reason);
            if (withReason.length === 0) return null;
            return (
              <div key={reason} className={styles.conflictGroup}>
                <p className={styles.muted}>{REASON_LABEL[reason]}</p>
                <ReservationList
                  reservations={withReason}
                  reassignmentOptions={reassignmentOptions}
                  day={day}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
