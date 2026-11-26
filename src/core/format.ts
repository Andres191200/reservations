import type { OpenDay } from "@/db/business-configuration";
import type { ReservationStatus } from "@/db/schema";
import { instantInTimeZone, TIME_ZONE, type CalendarDay } from "./time-zone";
import { weekdayName } from "./weekdays";

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

/** "45 minutos", "1 hora", "1 hora y 30 minutos". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const restText = `${rest} ${rest === 1 ? "minuto" : "minutos"}`;
  if (hours === 0) return restText;
  return rest === 0 ? formatHours(hours) : `${formatHours(hours)} y ${restText}`;
}

/** "1 hora", "24 horas". */
export function formatHours(hours: number): string {
  return `${hours} ${hours === 1 ? "hora" : "horas"}`;
}

/** "domingos", "lunes": for "no atiende los domingos". */
export function weekdayPlural(weekday: number): string {
  const name = weekdayName(weekday).toLowerCase();
  return name.endsWith("s") ? name : `${name}s`;
}

/** One line of the Opening hours as the Customer reads it. */
export type OpeningHoursLine = { days: string; hours: string };

/**
 * The Opening hours in a few lines: the weekdays with the same hours go together, and
 * three or more consecutive ones become a range ("Lunes a viernes", 09:00 a 18:00).
 * Lines go in the order of their first weekday; closed weekdays are not mentioned.
 */
export function openingHoursLines(openDays: OpenDay[]): OpeningHoursLine[] {
  const byHours = new Map<string, number[]>();
  for (const day of [...openDays].sort((a, b) => a.weekday - b.weekday)) {
    const hours = `${day.opensAt} a ${day.closesAt}`;
    byHours.set(hours, [...(byHours.get(hours) ?? []), day.weekday]);
  }
  return [...byHours].map(([hours, weekdays]) => ({ days: weekdaysText(weekdays), hours }));
}

/** [1, 2, 3, 5] → "Lunes a miércoles y viernes". */
function weekdaysText(weekdays: number[]): string {
  const runs: number[][] = [];
  for (const weekday of weekdays) {
    const run = runs.at(-1);
    if (run && run.at(-1) === weekday - 1) run.push(weekday);
    else runs.push([weekday]);
  }
  const name = (weekday: number) => weekdayName(weekday).toLowerCase();
  const items = runs.flatMap((run) =>
    run.length >= 3 ? [`${name(run[0])} a ${name(run.at(-1)!)}`] : run.map(name),
  );
  const text = items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
  return capitalize(text);
}
