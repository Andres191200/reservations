import type { EmptyDayReason, ReservableDaysOverview } from "@/core/available-slots";
import { formatDay, weekdayPlural } from "@/core/format";
import { weekdayOf, type CalendarDay } from "@/core/time-zone";

/** Why a Reservable day has no Available slots, as the Customer is told. */
export function emptyDayMessage(
  reason: EmptyDayReason,
  businessName: string,
  day: CalendarDay,
  today: CalendarDay,
): string {
  switch (reason) {
    case "weekdayClosed":
      return `${businessName} no atiende los ${weekdayPlural(weekdayOf(day))}.`;
    case "closure":
      return `${businessName} no atiende ese día.`;
    case "noneLeft":
      return `Ya no quedan horarios disponibles para ${day === today ? "hoy" : "este día"}.`;
  }
}

/**
 * Why the block of a link to the reservation form cannot be reserved. It says "ya no"
 * only when it could have been reserved before: a block that someone reserved or that
 * already started, or a day already past. A day the Business does not open on, or one
 * still too far ahead, never had it available, and the Customer is told why.
 */
export function unavailableSlotNotice(
  businessName: string,
  day: CalendarDay | undefined,
  overview: Pick<ReservableDaysOverview, "reservableDays" | "availabilityOn">,
): { title: string; detail?: string } {
  const gone = { title: "Ese horario ya no está disponible." };
  const never = { title: "Ese horario no está disponible." };
  const { first, last } = overview.reservableDays;

  if (!day) return never;
  if (day < first) return gone;
  if (day > last) return { ...never, detail: `Se puede reservar hasta el ${formatDay(last)}.` };

  const { emptyReason } = overview.availabilityOn(day);
  if (emptyReason === "weekdayClosed" || emptyReason === "closure") {
    return { ...never, detail: emptyDayMessage(emptyReason, businessName, day, first) };
  }
  return gone;
}
