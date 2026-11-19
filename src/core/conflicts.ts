import type { AdminReservation } from "@/db/reservations";
import type { BusinessId } from "@/db/schema";
import { getReservationsOnClosures } from "./closures";

/** Why a Confirmed Reservation cannot be served as it is. */
export type ConflictReason = "closure";

/**
 * Conflicting reservation: a Confirmed Reservation that cannot be served as it is. It
 * stays Confirmed until the Admin cancels it (or reassigns it, when the problem is the
 * Professional).
 */
export type ConflictingReservation = AdminReservation & { reason: ConflictReason };

/** The Conflicting reservations of the Business from today on, by start. */
export async function getConflictingReservations(
  businessId: BusinessId,
  now: Date,
): Promise<ConflictingReservation[]> {
  const onClosures = await getReservationsOnClosures(businessId, now);
  return onClosures.map((reservation) => ({ ...reservation, reason: "closure" as const }));
}
