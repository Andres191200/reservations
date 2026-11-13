import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getReservationForCustomer } from "@/core/cancellations";
import { capitalize, formatDay } from "@/core/format";
import { dayInTimeZone, TIME_ZONE_LABEL, timeInTimeZone } from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import type { ReservationStatus } from "@/db/schema";
import styles from "../../public-page.module.scss";
import { CancelReservation } from "./cancel-reservation";

export async function generateMetadata({
  params,
}: PageProps<"/[path]/reserva/[token]">): Promise<Metadata> {
  const business = await findBusinessByPath((await params).path);
  return {
    title: business ? `Tu Reserva en ${business.name}` : "Reserva no encontrada · Reservas",
    // The link is personal: keep it out of search engines and of the Referer header.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

/**
 * Page of the Cancellation link: the Customer sees their Reservation and, while the
 * Cancellation deadline allows it, cancels it. No account: the token is the key.
 */
export default function ReservationPage({ params }: PageProps<"/[path]/reserva/[token]">) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
        <CustomerReservation params={params} />
      </Suspense>
    </main>
  );
}

async function CustomerReservation({
  params,
}: Pick<PageProps<"/[path]/reserva/[token]">, "params">) {
  const { path, token } = await params;
  const business = await findBusinessByPath(path);
  if (!business) notFound();

  const now = new Date();
  const reservation = await getReservationForCustomer(business.id, token, now);
  if (!reservation) notFound();

  const { startsAt, status } = reservation;

  return (
    <>
      <header className={styles.header}>
        <p className={styles.muted}>Tu Reserva en</p>
        <h1>{business.name}</h1>
      </header>

      <section className={styles.card}>
        <dl className={styles.details}>
          <div>
            <dt>Día</dt>
            <dd>{capitalize(formatDay(dayInTimeZone(startsAt)))}</dd>
          </div>
          <div>
            <dt>Horario</dt>
            <dd>
              {timeInTimeZone(startsAt)} <span className={styles.muted}>({TIME_ZONE_LABEL})</span>
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={status === "cancelled" ? styles.cancelled : styles.confirmed}>
                {STATUS_LABEL[status]}
              </span>
            </dd>
          </div>
        </dl>

        {status === "cancelled" ? (
          <>
            <p className={styles.notice}>
              {reservation.cancelledBy === "business"
                ? `${business.name} canceló esta Reserva.`
                : "Cancelaste esta Reserva."}
            </p>
            <Link href={`/${path}`}>Reservar otro horario</Link>
          </>
        ) : reservation.cancellableByCustomer ? (
          <CancelReservation
            path={path}
            token={token}
            cancellableUntil={`${formatDay(dayInTimeZone(reservation.cancellableUntil))} a las ${timeInTimeZone(reservation.cancellableUntil)} (${TIME_ZONE_LABEL})`}
          />
        ) : startsAt <= now ? (
          <p className={styles.notice}>Esta Reserva ya pasó.</p>
        ) : (
          <p className={styles.notice}>
            Ya pasó el límite para cancelarla desde acá. Si no podés ir, contactá directamente a{" "}
            {business.name}.
          </p>
        )}
      </section>
    </>
  );
}
