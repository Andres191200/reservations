import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getReservationForCustomer } from "@/core/cancellations";
import { capitalize, formatDay, RESERVATION_STATUS_LABEL } from "@/core/format";
import { dayInTimeZone, TIME_ZONE_LABEL, timeInTimeZone } from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { JUST_CREATED_PARAM } from "../../format";
import styles from "../../public-page.module.scss";
import { CancelReservation } from "./cancel-reservation";
import { JustCreatedNotice } from "./just-created-notice";
import { ReservationNotFound } from "./reservation-not-found";

export async function generateMetadata({
  params,
}: PageProps<"/[path]/reserva/[token]">): Promise<Metadata> {
  const { path, token } = await params;
  const business = await findBusinessByPath(path);
  // A link without its Reservation shows "Reserva no encontrada", and so does the tab.
  const title =
    business && (await getReservationForCustomer(business.id, token, new Date()))
      ? `Tu reserva en ${business.name}`
      : "Reserva no encontrada · Reservas";
  return {
    title,
    // The link is personal: keep it out of search engines and of the Referer header.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * Page of the Cancellation link: the Customer sees their Reservation and, while the
 * Cancellation deadline allows it, cancels it. No account: the token is the key. It is
 * also where reserving from the public page ends, greeting the Customer once.
 */
export default function ReservationPage({
  params,
  searchParams,
}: PageProps<"/[path]/reserva/[token]">) {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <p className={styles.muted}>Cargando…</p>
        </main>
      }
    >
      <CustomerReservation params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CustomerReservation({ params, searchParams }: PageProps<"/[path]/reserva/[token]">) {
  const [{ path, token }, query] = await Promise.all([params, searchParams]);
  const business = await findBusinessByPath(path);
  if (!business) notFound();

  const now = new Date();
  const reservation = await getReservationForCustomer(business.id, token, now);
  // Not `notFound()`: this screen offers the page of the Business, which not-found.tsx
  // cannot know. The status is the same, 200: the page already started streaming.
  if (!reservation) return <ReservationNotFound business={business} />;

  const { startsAt, status, customerEmail, cancellableUntil } = reservation;
  // Only the Customer reserves from the public page, always with an email; a Cancelled
  // Reservation has nothing to celebrate.
  const justCreated =
    query[JUST_CREATED_PARAM] !== undefined && status === "confirmed" && customerEmail !== null;
  const cancellableUntilDay = formatDay(dayInTimeZone(cancellableUntil));
  const cancellableUntilTime = timeInTimeZone(cancellableUntil);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.muted}>Tu reserva en</p>
        <h1>{business.name}</h1>
      </header>

      {justCreated && (
        <JustCreatedNotice
          path={path}
          customerEmail={customerEmail}
          cancellableUntil={
            reservation.cancellableByCustomer
              ? {
                  day: cancellableUntilDay,
                  time: cancellableUntilTime,
                  timeZoneLabel: TIME_ZONE_LABEL,
                }
              : undefined
          }
        />
      )}

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
              {/* Stays on the page when the status changes, so the change is announced. */}
              <span role="status">
                <span className={status === "cancelled" ? styles.cancelled : styles.confirmed}>
                  {RESERVATION_STATUS_LABEL[status]}
                </span>
              </span>
            </dd>
          </div>
        </dl>

        {status === "cancelled" ? (
          <>
            <p className={styles.notice}>
              {reservation.cancelledBy === "business"
                ? `${business.name} canceló esta reserva.`
                : "Cancelaste esta reserva."}
            </p>
            <Link className={styles.textLink} href={`/${path}`}>
              Reservar otro horario
            </Link>
          </>
        ) : reservation.cancellableByCustomer ? (
          <CancelReservation
            path={path}
            token={token}
            // The greeting already says until when, a few lines above.
            cancellableUntil={
              justCreated
                ? undefined
                : `${cancellableUntilDay} a las ${cancellableUntilTime} (${TIME_ZONE_LABEL})`
            }
          />
        ) : startsAt <= now ? (
          <p className={styles.notice}>Esta reserva ya pasó.</p>
        ) : (
          <p className={styles.notice}>
            Ya pasó el límite para cancelarla desde acá. Si no podés ir, contactá directamente a{" "}
            {business.name}.
          </p>
        )}
      </section>
    </main>
  );
}
