import { listReservations, type AdminReservation } from "@/db/reservations";
import type { BusinessId } from "@/db/schema";
import { getActiveProfessionals, type Professional } from "./professionals";
import { addDays, instantInTimeZone, isCalendarDay, type CalendarDay } from "./time-zone";

export type { AdminReservation };

/**
 * Agenda: the Reservations of a Professional on a day, as the Admin sees them. It is not
 * a schedule of its own: every Professional shares the Opening hours (ADR 0001).
 */
export type Agenda = {
  /** `active` is false once the Professional was deactivated. */
  professional: Professional & { active: boolean };
  reservations: AdminReservation[];
};

/**
 * The Reservations of the Business that start on `day` (Argentina), Confirmed and
 * Cancelled, sorted by time and then by Professional name. A string that is not a valid
 * day has none.
 */
export async function getDayReservations(
  businessId: BusinessId,
  day: string,
): Promise<AdminReservation[]> {
  if (!isCalendarDay(day)) return [];
  return listReservations(
    businessId,
    instantInTimeZone(day, "00:00"),
    instantInTimeZone(addDays(day, 1), "00:00"),
  );
}

/**
 * The Agenda of each Professional of the Business on `day`: every active Professional
 * (by name), even without Reservations, and then every deactivated one that has
 * Reservations that day, so their history can still be seen.
 */
export async function getAgendas(businessId: BusinessId, day: CalendarDay): Promise<Agenda[]> {
  const [active, reservations] = await Promise.all([
    getActiveProfessionals(businessId),
    getDayReservations(businessId, day),
  ]);

  const activeIds = new Set(active.map((professional) => professional.id));
  const deactivated = new Map(
    reservations
      .map((reservation) => reservation.professional)
      .filter((professional) => !activeIds.has(professional.id))
      .map((professional) => [professional.id, professional]),
  );

  const agendaOf = (professional: Professional, isActive: boolean): Agenda => ({
    professional: { ...professional, active: isActive },
    reservations: reservations.filter(
      (reservation) => reservation.professional.id === professional.id,
    ),
  });

  return [
    ...active.map((professional) => agendaOf(professional, true)),
    ...[...deactivated.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((professional) => agendaOf(professional, false)),
  ];
}
