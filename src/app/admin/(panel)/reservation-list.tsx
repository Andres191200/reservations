import Link from "next/link";
import type { AdminReservation } from "@/core/agenda";
import { capitalize, formatDay, RESERVATION_STATUS_LABEL } from "@/core/format";
import {
  dayInTimeZone,
  timeInTimeZone,
  TIME_ZONE_LABEL,
  type CalendarDay,
} from "@/core/time-zone";
import type { CancelledBy } from "@/db/schema";
import styles from "../admin.module.scss";
import { CancelReservationButton } from "./cancel-reservation-button";
import { DAY_PARAM, panelHref, PROFESSIONAL_PARAM } from "./day";

const CANCELLED_BY_LABEL: Record<CancelledBy, string> = {
  customer: "por el Cliente",
  business: "por el Negocio",
};

/**
 * Reservations of a day, in the order received. Confirmed and Cancelled ones look
 * different, so the Cancelled are not counted by mistake; only a Confirmed one can be
 * cancelled from here. With `day`, the name of each
 * Professional links to their Agenda that day; without it, the Professional is not shown
 * (inside an Agenda, it is always the same one).
 */
export function ReservationList({
  reservations,
  day,
}: {
  reservations: AdminReservation[];
  day?: CalendarDay;
}) {
  return (
    <>
      <ReservationCount reservations={reservations} />
      <ul className={styles.reservations}>
        {reservations.map((reservation) => (
          <ReservationRow key={reservation.id} reservation={reservation} day={day} />
        ))}
      </ul>
      <p className={styles.hint}>Horarios en {TIME_ZONE_LABEL}.</p>
    </>
  );
}

function ReservationRow({
  reservation,
  day,
}: {
  reservation: AdminReservation;
  day?: CalendarDay;
}) {
  const { startsAt, endsAt, status, cancelledBy, professional } = reservation;
  const cancelled = status === "cancelled";

  return (
    <li className={cancelled ? styles.cancelledReservation : styles.reservation}>
      <time className={styles.reservationTime} dateTime={startsAt.toISOString()}>
        {timeInTimeZone(startsAt)}
        <span className={styles.muted}> – {timeInTimeZone(endsAt)}</span>
      </time>
      <div className={styles.reservationCustomer}>
        <span className={styles.customerName}>{reservation.customerName}</span>
        <span className={styles.contact}>
          {reservation.customerEmail && (
            <a href={`mailto:${reservation.customerEmail}`}>{reservation.customerEmail}</a>
          )}
          {reservation.customerPhone && (
            <a href={`tel:${reservation.customerPhone.replace(/[^0-9+]/g, "")}`}>
              {reservation.customerPhone}
            </a>
          )}
          {reservation.createdBy === "admin" && (
            <span className={styles.muted}>Cargada desde el panel</span>
          )}
        </span>
      </div>
      <div className={styles.reservationMeta}>
        {day && (
          <Link
            href={panelHref("/admin/agenda", {
              [DAY_PARAM]: day,
              [PROFESSIONAL_PARAM]: professional.id,
            })}
          >
            {professional.name}
          </Link>
        )}
        <span className={cancelled ? styles.cancelledBadge : styles.confirmedBadge}>
          {RESERVATION_STATUS_LABEL[status]}
          {cancelled && cancelledBy && ` ${CANCELLED_BY_LABEL[cancelledBy]}`}
        </span>
        {!cancelled && (
          <CancelReservationButton
            reservationId={reservation.id}
            customerName={reservation.customerName}
            customerEmail={reservation.customerEmail}
            when={`${capitalize(formatDay(dayInTimeZone(startsAt)))}, ${timeInTimeZone(startsAt)} (${TIME_ZONE_LABEL})`}
            professionalName={professional.name}
          />
        )}
      </div>
    </li>
  );
}

function ReservationCount({ reservations }: { reservations: AdminReservation[] }) {
  const confirmed = reservations.filter((reservation) => reservation.status === "confirmed");
  const cancelled = reservations.length - confirmed.length;

  return (
    <p className={styles.muted}>
      {plural(confirmed.length, "Confirmada", "Confirmadas")}
      {cancelled > 0 && ` · ${plural(cancelled, "Cancelada", "Canceladas")}`}
    </p>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
