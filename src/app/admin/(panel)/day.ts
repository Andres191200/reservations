import { isCalendarDay, type CalendarDay } from "@/core/time-zone";

/** Query parameter with the day the panel shows: /admin/reservas?dia=2026-11-12. */
export const DAY_PARAM = "dia";

/** Query parameter with the Professional whose Agenda is shown: /admin/agenda?profesional=<id>. */
export const PROFESSIONAL_PARAM = "profesional";

type Query = Record<string, string | string[] | undefined>;

/** The value of a query parameter, if it came once. */
export function queryValue(query: Query, name: string): string | undefined {
  const value = query[name];
  return typeof value === "string" ? value : undefined;
}

/**
 * The day asked for in the URL, or `today` when there is none or it is not a valid day.
 * The panel is not limited to the Reservable days: past and far days can be seen too.
 */
export function chosenDay(query: Query, today: CalendarDay): CalendarDay {
  const requested = queryValue(query, DAY_PARAM);
  return requested && isCalendarDay(requested) ? requested : today;
}

/** A panel route with its query parameters. */
export function panelHref(route: string, params: Record<string, string>): string {
  return `${route}?${new URLSearchParams(params)}`;
}
