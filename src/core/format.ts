import type { ReservationStatus } from "@/db/schema";
import { instantInTimeZone, TIME_ZONE, type CalendarDay } from "./time-zone";

// How things are written in the texts users read (pages and emails), in Spanish.

/** The Reservation status as users read it. */
export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

const dayFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

/** "miércoles 11 de noviembre". */
export function formatDay(day: CalendarDay): string {
  return dayFormat.format(instantInTimeZone(day, "12:00")).replace(",", "");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
