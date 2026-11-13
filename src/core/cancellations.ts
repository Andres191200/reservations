import { getBusiness } from "@/db/businesses";
import {
  cancelReservation,
  findReservationByToken,
  type CustomerReservation,
} from "@/db/reservations";
import type { BusinessId, CancelledBy, ReservationId, ReservationStatus } from "@/db/schema";
import { getReservationRules } from "./business-configuration";
import { sendWithoutFailing, type EmailSender } from "./email";
import { cancellationEmail } from "./reservation-emails";
import type { Result } from "./result";

const HOUR_MS = 60 * 60 * 1000;

/** A real token is 43 characters (see `generateCancellationToken`): anything far longer is not one. */
const TOKEN_MAX_LENGTH = 100;

/** Shown for a token that does not exist, or that belongs to another Business. */
export const RESERVATION_NOT_FOUND_ERROR = "Reserva no encontrada.";

export const ALREADY_CANCELLED_ERROR = "Esta Reserva ya está cancelada.";

export const PAST_CANCELLATION_DEADLINE_ERROR =
  "Ya pasó el límite de cancelación. Si no podés ir, contactá al Negocio.";

/** What the Customer sees of their Reservation through the Cancellation link. */
export type ReservationForCustomer = {
  id: ReservationId;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  /** Who made the Cancellation, once it is Cancelled. */
  cancelledBy: CancelledBy | null;
  /** Last instant the Customer can cancel it on their own (the Cancellation deadline). */
  cancellableUntil: Date;
  /** Confirmed and before the Cancellation deadline: the Customer can still cancel it. */
  cancellableByCustomer: boolean;
};

/**
 * The Reservation of the Cancellation link `app.com/<path>/reserva/<token>`, where
 * `businessId` is the Business of the path. A token that does not exist, or that belongs
 * to another Business, finds nothing. `now` is the clock, received from outside.
 */
export async function getReservationForCustomer(
  businessId: BusinessId,
  cancellationToken: string,
  now: Date,
): Promise<ReservationForCustomer | undefined> {
  const reservation = await findByToken(businessId, cancellationToken);
  if (!reservation) return undefined;
  return forCustomer(reservation, await cancellationDeadlineHours(businessId), now);
}

/**
 * Cancellation by the Customer, through their Cancellation link. Only a Confirmed
 * Reservation, and only before the Business's Cancellation deadline; past it, only the
 * Business can cancel it. Once Cancelled, its time is an Available slot again (only
 * Confirmed Reservations keep a Professional busy) and the Reservation is never
 * reactivated or modified.
 *
 * The Customer then receives the cancellation email. If it cannot be sent, the
 * Cancellation stays made and the error is logged.
 */
export async function cancelByCustomer(
  businessId: BusinessId,
  cancellationToken: string,
  now: Date,
  emailSender: EmailSender,
): Promise<Result<ReservationForCustomer>> {
  const reservation = await findByToken(businessId, cancellationToken);
  if (!reservation) return { ok: false, error: RESERVATION_NOT_FOUND_ERROR };

  const deadlineHours = await cancellationDeadlineHours(businessId);
  const current = forCustomer(reservation, deadlineHours, now);
  if (current.status === "cancelled") return { ok: false, error: ALREADY_CANCELLED_ERROR };
  if (!current.cancellableByCustomer) {
    return { ok: false, error: PAST_CANCELLATION_DEADLINE_ERROR };
  }

  const cancelled = await cancelReservation(businessId, reservation.id, {
    cancelledBy: "customer",
    cancelledAt: now,
  });
  // Someone else cancelled it between reading and writing (another tab, the Business).
  if (!cancelled) return { ok: false, error: ALREADY_CANCELLED_ERROR };

  await sendCancellationEmail(emailSender, businessId, cancelled);
  return { ok: true, value: forCustomer(cancelled, deadlineHours, now) };
}

async function findByToken(
  businessId: BusinessId,
  cancellationToken: string,
): Promise<CustomerReservation | undefined> {
  if (cancellationToken.length === 0 || cancellationToken.length > TOKEN_MAX_LENGTH) {
    return undefined;
  }
  return findReservationByToken(businessId, cancellationToken);
}

async function cancellationDeadlineHours(businessId: BusinessId): Promise<number> {
  return (await getReservationRules(businessId)).cancellationDeadlineHours;
}

/**
 * The Cancellation deadline is how much time, at least, has to be left before the start:
 * exactly that much left still counts, like the Minimum notice.
 */
function forCustomer(
  reservation: CustomerReservation,
  cancellationDeadlineHours: number,
  now: Date,
): ReservationForCustomer {
  const cancellableUntil = new Date(
    reservation.startsAt.getTime() - cancellationDeadlineHours * HOUR_MS,
  );
  return {
    id: reservation.id,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    status: reservation.status,
    cancelledBy: reservation.cancelledBy,
    cancellableUntil,
    cancellableByCustomer:
      reservation.status === "confirmed" && now.getTime() <= cancellableUntil.getTime(),
  };
}

async function sendCancellationEmail(
  emailSender: EmailSender,
  businessId: BusinessId,
  reservation: CustomerReservation,
): Promise<void> {
  // The Customer's email stays out of the logs; the Reservation id is enough to find it.
  await sendWithoutFailing(
    emailSender,
    async () => {
      const business = await getBusiness(businessId);
      if (!business) throw new Error("No se encontró el Negocio de la Reserva");
      return cancellationEmail({
        business,
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        startsAt: reservation.startsAt,
      });
    },
    `No se pudo enviar el email de cancelación de la Reserva ${reservation.id}:`,
  );
}
