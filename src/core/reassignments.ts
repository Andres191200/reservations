import { z } from "zod";
import {
  findReservation,
  listBusyTimes,
  reassignReservation,
  type AdminReservation,
} from "@/db/reservations";
import type { BusinessId, ProfessionalId, ReservationId } from "@/db/schema";
import { getAbsentProfessionals, professionalAbsentError } from "./absences";
import { RESERVATION_NOT_FOUND_ERROR } from "./cancellations";
import {
  getActiveProfessionals,
  PROFESSIONAL_NOT_FOUND_ERROR,
  type Professional,
} from "./professionals";
import type { Result } from "./result";
import { dayInTimeZone } from "./time-zone";

export const CANCELLED_CANNOT_BE_REASSIGNED_ERROR = "Una Reserva Cancelada no se puede reasignar.";

export function alreadyAssignedError(name: string): string {
  return `La Reserva ya está asignada a ${name}.`;
}

/** Shown when the chosen Professional already has a Reservation at that time. */
export function busyForReassignmentError(name: string): string {
  return `${name} ya tiene una Reserva en ese horario. Elegí otro Profesional.`;
}

/**
 * For each Confirmed Reservation of the list, the active Professionals it can be
 * reassigned to: every one but its own that is not Absent that day and has no Confirmed
 * Reservation overlapping it. Cancelled Reservations get none.
 */
export async function getReassignmentOptions(
  businessId: BusinessId,
  reservations: AdminReservation[],
): Promise<Map<ReservationId, Professional[]>> {
  const options = new Map<ReservationId, Professional[]>();
  const confirmed = reservations.filter((reservation) => reservation.status === "confirmed");
  if (confirmed.length === 0) return options;

  const starts = confirmed.map((reservation) => reservation.startsAt.getTime());
  const ends = confirmed.map((reservation) => reservation.endsAt.getTime());
  const from = new Date(Math.min(...starts));
  const to = new Date(Math.max(...ends));
  const [active, busyTimes, absentOn] = await Promise.all([
    getActiveProfessionals(businessId),
    listBusyTimes(businessId, from, to),
    getAbsentProfessionals(businessId, dayInTimeZone(from), dayInTimeZone(to)),
  ]);

  for (const reservation of confirmed) {
    const busy = new Set(
      busyTimes
        .filter((busyTime) => overlaps(busyTime, reservation))
        .map((busyTime) => busyTime.professionalId),
    );
    const absent = absentOn(dayInTimeZone(reservation.startsAt));
    options.set(
      reservation.id,
      active.filter(
        (professional) =>
          professional.id !== reservation.professional.id &&
          !busy.has(professional.id) &&
          !absent.has(professional.id),
      ),
    );
  }
  return options;
}

function overlaps(a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }) {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

/**
 * Reassignment: the Admin moves a Confirmed Reservation to another active Professional,
 * not Absent that day, free at the same time. The time does not change and the Customer is not told: they
 * never chose a Professional (ADR 0001). Both ids come from the panel, so they are
 * checked: they only work on a Reservation and a Professional of this Business.
 */
export async function reassign(
  businessId: BusinessId,
  reservationId: string,
  professionalId: string,
): Promise<Result<{ professional: Professional }>> {
  if (!z.uuid().safeParse(reservationId).success) {
    return { ok: false, error: RESERVATION_NOT_FOUND_ERROR };
  }
  const reservation = await findReservation(businessId, reservationId as ReservationId);
  if (!reservation) return { ok: false, error: RESERVATION_NOT_FOUND_ERROR };
  if (reservation.status === "cancelled") {
    return { ok: false, error: CANCELLED_CANNOT_BE_REASSIGNED_ERROR };
  }

  const professional = z.uuid().safeParse(professionalId).success
    ? (await getActiveProfessionals(businessId)).find(
        (candidate) => candidate.id === professionalId,
      )
    : undefined;
  if (!professional) return { ok: false, error: PROFESSIONAL_NOT_FOUND_ERROR };
  if (professional.id === reservation.professionalId) {
    return { ok: false, error: alreadyAssignedError(professional.name) };
  }
  const day = dayInTimeZone(reservation.startsAt);
  if ((await getAbsentProfessionals(businessId, day))(day).has(professional.id)) {
    return { ok: false, error: professionalAbsentError(professional.name) };
  }

  // The database has the last word: the Professional may have been taken, or the
  // Reservation cancelled, since the panel showed them.
  const outcome = await reassignReservation(
    businessId,
    reservation.id,
    professional.id as ProfessionalId,
  );
  if (outcome === "busy") return { ok: false, error: busyForReassignmentError(professional.name) };
  if (outcome === "not-confirmed") {
    return { ok: false, error: CANCELLED_CANNOT_BE_REASSIGNED_ERROR };
  }
  return { ok: true, value: { professional } };
}
