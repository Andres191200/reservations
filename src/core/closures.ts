import { z } from "zod";
import * as data from "@/db/closures";
import type { Closure } from "@/db/closures";
import type { AdminReservation } from "@/db/reservations";
import type { BusinessId, ClosureId } from "@/db/schema";
import { formatDay } from "./format";
import type { Result } from "./result";
import { dayInTimeZone, isCalendarDay } from "./time-zone";

export type { Closure };

export const INVALID_CLOSURE_DAY_ERROR = "Elegí un día válido para el Cierre.";
export const PAST_CLOSURE_DAY_ERROR = "No se puede cargar un Cierre en un día que ya pasó.";
export const CLOSURE_NOT_FOUND_ERROR = "Ese Cierre no existe o ya fue eliminado.";

export function closureExistsError(day: string): string {
  return `Ya hay un Cierre el ${formatDay(day)}.`;
}

/**
 * Adds a Closure: on `day` the Business does not open, even if its Opening hours say
 * otherwise, so that day offers no Available slots. Today counts; a past day does not.
 * Reservations already Confirmed that day are not touched: they become Conflicting
 * reservations, returned here so the Admin can cancel them.
 */
export async function addClosure(
  businessId: BusinessId,
  day: string,
  now: Date,
): Promise<Result<{ closure: Closure; conflicts: AdminReservation[] }>> {
  if (!isCalendarDay(day)) return { ok: false, error: INVALID_CLOSURE_DAY_ERROR };
  if (day < dayInTimeZone(now)) return { ok: false, error: PAST_CLOSURE_DAY_ERROR };

  const closure = await data.insertClosure(businessId, day);
  if (!closure) return { ok: false, error: closureExistsError(day) };

  const conflicts = (await data.listConfirmedReservationsOnClosures(businessId, day)).filter(
    (reservation) => dayInTimeZone(reservation.startsAt) === day,
  );
  return { ok: true, value: { closure, conflicts } };
}

/**
 * Removes a Closure: the day offers Available slots again. `closureId` comes from the
 * panel, so it is checked: it only works on a Closure of this Business.
 */
export async function removeClosure(
  businessId: BusinessId,
  closureId: string,
): Promise<Result<void>> {
  if (!z.uuid().safeParse(closureId).success) {
    return { ok: false, error: CLOSURE_NOT_FOUND_ERROR };
  }
  const deleted = await data.deleteClosure(businessId, closureId as ClosureId);
  return deleted ? { ok: true, value: undefined } : { ok: false, error: CLOSURE_NOT_FOUND_ERROR };
}

/** The Closures of the Business from today on, by day. Past ones are history. */
export function getUpcomingClosures(businessId: BusinessId, now: Date): Promise<Closure[]> {
  return data.listClosures(businessId, dayInTimeZone(now));
}

/** Whether the Business has a Closure on `day`. */
export function isClosed(businessId: BusinessId, day: string): Promise<boolean> {
  if (!isCalendarDay(day)) return Promise.resolve(false);
  return data.hasClosure(businessId, day);
}

/**
 * The Conflicting reservations because of a Closure: the Confirmed Reservations from
 * today on that fall on a day with a Closure. They stop being so once cancelled.
 */
export function getReservationsOnClosures(
  businessId: BusinessId,
  now: Date,
): Promise<AdminReservation[]> {
  return data.listConfirmedReservationsOnClosures(businessId, dayInTimeZone(now));
}
