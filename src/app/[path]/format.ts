import type { CalendarDay } from "@/core/time-zone";

/** Query parameter with the chosen day: app.com/<path>?dia=2026-11-12. */
export const DAY_PARAM = "dia";

/** Query parameter with the chosen block: app.com/<path>/reservar?horario=<ISO instant>. */
export const SLOT_PARAM = "horario";

/**
 * Query parameter that marks the page of a Reservation as just created:
 * app.com/<path>/reserva/<token>?nueva=1. It only says that: the rest comes from the
 * Reservation, read on the server.
 */
export const JUST_CREATED_PARAM = "nueva";

/** The public page of the Business, on that day. */
export function dayHref(path: string, day: CalendarDay): string {
  return `/${path}?${DAY_PARAM}=${day}`;
}

/** The form to reserve the block that starts at `startsAt`. */
export function reserveHref(path: string, startsAt: Date): string {
  return `/${path}/reservar?${new URLSearchParams({ [SLOT_PARAM]: startsAt.toISOString() })}`;
}

/** The page of a Reservation: the one its Cancellation link opens. */
export function reservationHref(
  path: string,
  cancellationToken: string,
  options: { justCreated?: boolean } = {},
): string {
  const href = `/${path}/reserva/${cancellationToken}`;
  return options.justCreated ? `${href}?${JUST_CREATED_PARAM}=1` : href;
}
