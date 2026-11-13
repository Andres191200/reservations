import type { CalendarDay } from "@/core/time-zone";

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
