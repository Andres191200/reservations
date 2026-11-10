"use server";

import {
  saveOpeningHours as saveOpeningHoursInCore,
  saveReservationRules as saveReservationRulesInCore,
  type OpenDay,
} from "@/core/business-configuration";
import { WEEKDAYS } from "@/core/weekdays";
import { getSessionBusiness } from "../../session";

/** One row of the Opening hours form, as the Admin left it. */
export type DayFields = { weekday: number; closed: boolean; opensAt: string; closesAt: string };

export type OpeningHoursState = { error?: string; saved?: boolean; days?: DayFields[] };

export async function saveOpeningHours(
  _previous: OpeningHoursState,
  formData: FormData,
): Promise<OpeningHoursState> {
  // The Business always comes from the session, never from the form.
  const business = await getSessionBusiness();

  const days: DayFields[] = WEEKDAYS.map(({ weekday }) => ({
    weekday,
    closed: formData.get(`closed-${weekday}`) === "on",
    opensAt: String(formData.get(`opensAt-${weekday}`) ?? ""),
    closesAt: String(formData.get(`closesAt-${weekday}`) ?? ""),
  }));
  const openDays: OpenDay[] = days
    .filter((day) => !day.closed)
    .map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt }));

  const result = await saveOpeningHoursInCore(business.id, openDays);
  if (!result.ok) return { error: result.error, days };
  return { saved: true, days };
}

export type ReservationRulesFields = {
  reservationDurationMinutes: string;
  minimumNoticeHours: string;
  maximumNoticeDays: string;
  cancellationDeadlineHours: string;
};

export type ReservationRulesState = {
  error?: string;
  saved?: boolean;
  fields?: ReservationRulesFields;
};

export async function saveReservationRules(
  _previous: ReservationRulesState,
  formData: FormData,
): Promise<ReservationRulesState> {
  const business = await getSessionBusiness();

  const fields: ReservationRulesFields = {
    reservationDurationMinutes: String(formData.get("reservationDurationMinutes") ?? ""),
    minimumNoticeHours: String(formData.get("minimumNoticeHours") ?? ""),
    maximumNoticeDays: String(formData.get("maximumNoticeDays") ?? ""),
    cancellationDeadlineHours: String(formData.get("cancellationDeadlineHours") ?? ""),
  };

  const result = await saveReservationRulesInCore(business.id, fields);
  if (!result.ok) return { error: result.error, fields };
  return { saved: true, fields };
}
