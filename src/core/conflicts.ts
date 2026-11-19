import {
  listConfirmedReservationsOfDeactivated,
  type AdminReservation,
} from "@/db/reservations";
import type { BusinessId, ReservationId } from "@/db/schema";
import { getReservationsInAbsences } from "./absences";
import { getReservationsOnClosures } from "./closures";
import { dayInTimeZone } from "./time-zone";

/**
 * Why a Confirmed Reservation cannot be served as it is: its day has a Closure, its
 * Professional is Absent that day, or its Professional was deactivated.
 */
export type ConflictReason = "closure" | "absence" | "deactivated";

/**
 * Conflicting reservation: a Confirmed Reservation that cannot be served as it is. It
 * stays Confirmed until the Admin reassigns it (when the problem is the Professional) or
 * cancels it.
 */
export type ConflictingReservation = AdminReservation & { reason: ConflictReason };

/**
 * When a Reservation has more than one reason, the one that says what can be done: with
 * a Closure, reassigning does not help; with a deactivated Professional, the Absence no
 * longer matters.
 */
const PRIORITY: ConflictReason[] = ["closure", "deactivated", "absence"];

/** The Conflicting reservations of the Business from today on, by start. */
export async function getConflictingReservations(
  businessId: BusinessId,
  now: Date,
): Promise<ConflictingReservation[]> {
  const [closure, deactivated, absence] = await Promise.all([
    getReservationsOnClosures(businessId, now),
    listConfirmedReservationsOfDeactivated(businessId, dayInTimeZone(now)),
    getReservationsInAbsences(businessId, now),
  ]);
  const byReason: Record<ConflictReason, AdminReservation[]> = { closure, deactivated, absence };

  const conflicts = new Map<ReservationId, ConflictingReservation>();
  for (const reason of PRIORITY) {
    for (const reservation of byReason[reason]) {
      if (!conflicts.has(reservation.id)) conflicts.set(reservation.id, { ...reservation, reason });
    }
  }
  return [...conflicts.values()].sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.professional.name.localeCompare(b.professional.name, "es"),
  );
}
