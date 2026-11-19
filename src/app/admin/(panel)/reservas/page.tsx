import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDayReservations } from "@/core/agenda";
import { isClosed } from "@/core/closures";
import { getReassignmentOptions } from "@/core/reassignments";
import { dayInTimeZone } from "@/core/time-zone";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { chosenDay, DAY_PARAM, panelHref } from "../day";
import { DayNavigation } from "../day-navigation";
import { ReservationList } from "../reservation-list";

export const metadata: Metadata = { title: "Reservas del día · Reservas" };

const ROUTE = "/admin/reservas";

/** The Reservations of a day, of every Professional, to organize the day. */
export default function DayReservationsPage({ searchParams }: PageProps<"/admin/reservas">) {
  return (
    <>
      <h1>Reservas del día</h1>
      <div className={styles.sections}>
        <section className={styles.section}>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <DayReservations searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function DayReservations({
  searchParams,
}: Pick<PageProps<"/admin/reservas">, "searchParams">) {
  const [business, query] = await Promise.all([getSessionBusiness(), searchParams]);
  const today = dayInTimeZone(new Date());
  const day = chosenDay(query, today);
  const [reservations, closed] = await Promise.all([
    getDayReservations(business.id, day),
    isClosed(business.id, day),
  ]);
  const reassignmentOptions = await getReassignmentOptions(business.id, reservations);

  return (
    <>
      <DayNavigation route={ROUTE} day={day} today={today} />
      {closed && (
        <p className={styles.notice}>
          Este día tiene un Cierre: no se ofrecen Horarios disponibles.{" "}
          <Link href="/admin/cierres">Ver Cierres</Link>
        </p>
      )}
      <div className={styles.headerActions}>
        <Link
          href={panelHref("/admin/reservas/nueva", { [DAY_PARAM]: day })}
          className={styles.linkButton}
        >
          Nueva Reserva
        </Link>
      </div>
      {reservations.length === 0 ? (
        <p className={styles.notice}>No hay Reservas este día.</p>
      ) : (
        <ReservationList
          reservations={reservations}
          reassignmentOptions={reassignmentOptions}
          day={day}
        />
      )}
    </>
  );
}
