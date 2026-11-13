import { instantInTimeZone, TIME_ZONE, type CalendarDay } from "./time-zone";

// How days are written in the texts users read (pages and emails), in Spanish.

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
