import { z } from "zod";
import * as data from "@/db/absences";
import type { Absence } from "@/db/absences";
import type { AdminReservation } from "@/db/reservations";
import type { AbsenceId, BusinessId, ProfessionalId } from "@/db/schema";
import { formatDay } from "./format";
import { getActiveProfessionals, PROFESSIONAL_NOT_FOUND_ERROR } from "./professionals";
import type { Result } from "./result";
import { dayInTimeZone, isCalendarDay, type CalendarDay } from "./time-zone";

export type { Absence };

export const INVALID_ABSENCE_DAYS_ERROR = "Elegí el primer y el último día de la Ausencia.";
export const ABSENCE_ENDS_BEFORE_START_ERROR =
  "El último día de la Ausencia no puede ser anterior al primero.";
export const PAST_ABSENCE_ERROR = "La Ausencia no puede empezar en un día que ya pasó.";
export const ABSENCE_NOT_FOUND_ERROR = "Esa Ausencia no existe o ya fue eliminada.";

export function overlappingAbsenceError(name: string): string {
  return `${name} ya tiene una Ausencia en esos días.`;
}

/** Shown when the Admin chooses a Professional that is Absent that day. */
export function professionalAbsentError(name: string): string {
  return `${name} tiene una Ausencia ese día. Elegí otro Profesional.`;
}

export type NewAbsence = { professionalId: string; startsOn: string; endsOn: string };

/**
 * Adds an Absence: whole days, from `startsOn` to `endsOn` (both included), in which an
 * active Professional does not serve, so each block of those days accepts one Reservation
 * less (ADR 0001). It cannot start before today, nor overlap another Absence of the same
 * Professional. The Professional's Confirmed Reservations in those days are not touched:
 * they become Conflicting reservations, returned here so the Admin can reassign or
 * cancel them.
 */
export async function addAbsence(
  businessId: BusinessId,
  input: NewAbsence,
  now: Date,
): Promise<Result<{ absence: Absence; conflicts: AdminReservation[] }>> {
  const { startsOn, endsOn } = input;
  if (!isCalendarDay(startsOn) || !isCalendarDay(endsOn)) {
    return { ok: false, error: INVALID_ABSENCE_DAYS_ERROR };
  }
  if (endsOn < startsOn) return { ok: false, error: ABSENCE_ENDS_BEFORE_START_ERROR };
  if (startsOn < dayInTimeZone(now)) return { ok: false, error: PAST_ABSENCE_ERROR };

  const professional = z.uuid().safeParse(input.professionalId).success
    ? (await getActiveProfessionals(businessId)).find(
        (candidate) => candidate.id === input.professionalId,
      )
    : undefined;
  if (!professional) return { ok: false, error: PROFESSIONAL_NOT_FOUND_ERROR };

  const overlapping = await data.listAbsences(businessId, {
    fromDay: startsOn,
    toDay: endsOn,
    professionalId: professional.id,
  });
  if (overlapping.length > 0) {
    return { ok: false, error: overlappingAbsenceError(professional.name) };
  }

  const id = await data.insertAbsence(businessId, {
    professionalId: professional.id,
    startsOn,
    endsOn,
  });
  const conflicts = await data.listConfirmedReservationsInAbsences(businessId, startsOn, id);
  return { ok: true, value: { absence: { id, professional, startsOn, endsOn }, conflicts } };
}

/**
 * Removes an Absence: the Professional serves those days again. `absenceId` comes from
 * the panel, so it is checked: it only works on an Absence of this Business.
 */
export async function removeAbsence(
  businessId: BusinessId,
  absenceId: string,
): Promise<Result<void>> {
  if (!z.uuid().safeParse(absenceId).success) {
    return { ok: false, error: ABSENCE_NOT_FOUND_ERROR };
  }
  const deleted = await data.deleteAbsence(businessId, absenceId as AbsenceId);
  return deleted ? { ok: true, value: undefined } : { ok: false, error: ABSENCE_NOT_FOUND_ERROR };
}

/** The Absences of the Business that have not ended yet, by start. */
export function getUpcomingAbsences(businessId: BusinessId, now: Date): Promise<Absence[]> {
  return data.listAbsences(businessId, { fromDay: dayInTimeZone(now) });
}

/**
 * Which Professionals are Absent on each day of [fromDay, toDay]: a function from a day
 * to the set of their ids. One query for the whole range.
 */
export async function getAbsentProfessionals(
  businessId: BusinessId,
  fromDay: CalendarDay,
  toDay: CalendarDay = fromDay,
): Promise<(day: CalendarDay) => Set<ProfessionalId>> {
  const absences = await data.listAbsences(businessId, { fromDay, toDay });
  return (day) =>
    new Set(
      absences
        .filter((absence) => absence.startsOn <= day && day <= absence.endsOn)
        .map((absence) => absence.professional.id),
    );
}

/**
 * The Conflicting reservations because of an Absence: the Confirmed Reservations from
 * today on that fall on a day their Professional is Absent. They stop being so once
 * reassigned to another Professional or cancelled.
 */
export function getReservationsInAbsences(
  businessId: BusinessId,
  now: Date,
): Promise<AdminReservation[]> {
  return data.listConfirmedReservationsInAbsences(businessId, dayInTimeZone(now));
}

/** "del lunes 16 de noviembre al miércoles 18 de noviembre", or "el lunes 16 de noviembre". */
export function absenceDaysText(absence: Pick<Absence, "startsOn" | "endsOn">): string {
  return absence.startsOn === absence.endsOn
    ? `el ${formatDay(absence.startsOn)}`
    : `del ${formatDay(absence.startsOn)} al ${formatDay(absence.endsOn)}`;
}
