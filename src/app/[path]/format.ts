import { instantInTimeZone, TIME_ZONE, type CalendarDay } from "@/core/time-zone";

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

/** Query parameter with the chosen day: app.com/<path>?dia=2026-11-12. */
export const DAY_PARAM = "dia";

/** Query parameter with the chosen block: app.com/<path>/reservar?horario=<ISO instant>. */
export const SLOT_PARAM = "horario";

/** The public page of the Business, on that day. */
export function dayHref(path: string, day: CalendarDay): string {
  return `/${path}?${DAY_PARAM}=${day}`;
}

/** The form to reserve the block that starts at `startsAt`. */
export function reserveHref(path: string, startsAt: Date): string {
  return `/${path}/reservar?${new URLSearchParams({ [SLOT_PARAM]: startsAt.toISOString() })}`;
}
