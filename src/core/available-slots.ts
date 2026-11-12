import type { OpenDay, ReservationRules } from "@/db/business-configuration";
import type { BusinessId } from "@/db/schema";
import { getOpeningHours, getReservationRules } from "./business-configuration";
import { getActiveProfessionals } from "./professionals";
import {
  addDays,
  dayInTimeZone,
  instantInTimeZone,
  isCalendarDay,
  timeInTimeZone,
  weekdayOf,
  type CalendarDay,
} from "./time-zone";

/** A block of the Opening hours that a Customer can still reserve. */
export type AvailableSlot = {
  /** When the block starts, as an instant (stored in UTC). */
  startsAt: Date;
  /** When the block starts, "HH:MM" in Argentina time: what the Customer reads. */
  time: string;
};

/** The days a Customer can choose: from today to the Maximum notice, both included. */
export type ReservableDays = { first: CalendarDay; last: CalendarDay };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Today and the following `maximumNoticeDays` days, in Argentina. `now` is the clock,
 * received from outside so tests can simulate it.
 */
export function getReservableDays(
  rules: Pick<ReservationRules, "maximumNoticeDays">,
  now: Date,
): ReservableDays {
  const today = dayInTimeZone(now);
  return { first: today, last: addDays(today, rules.maximumNoticeDays) };
}

/**
 * The Available slots of the Business on `day` (Argentina), computed at the moment from
 * the clock `now`. Closures, Absences and Reservations are not subtracted yet.
 * A day outside the Reservable days, or not a valid day, has none.
 */
export async function getAvailableSlots(
  businessId: BusinessId,
  day: string,
  now: Date,
): Promise<AvailableSlot[]> {
  const [openingHours, rules, professionals] = await Promise.all([
    getOpeningHours(businessId),
    getReservationRules(businessId),
    getActiveProfessionals(businessId),
  ]);
  return computeAvailableSlots({
    day,
    now,
    openingHours,
    rules,
    activeProfessionals: professionals.length,
  });
}

/** The calculation itself, without reading the database. */
function computeAvailableSlots(input: {
  day: string;
  now: Date;
  openingHours: OpenDay[];
  rules: ReservationRules;
  activeProfessionals: number;
}): AvailableSlot[] {
  const { day, now, openingHours, rules, activeProfessionals } = input;

  if (!isCalendarDay(day)) return [];
  const { first, last } = getReservableDays(rules, now);
  if (day < first || day > last) return [];

  const openDay = openingHours.find((open) => open.weekday === weekdayOf(day));
  if (!openDay) return [];

  // Each block accepts as many Reservations as free Professionals (ADR 0001).
  if (activeProfessionals === 0) return [];

  const earliestStart = now.getTime() + rules.minimumNoticeHours * HOUR_MS;

  return blockStarts(openDay, rules.reservationDurationMinutes)
    .map((time) => instantInTimeZone(day, time))
    .filter((startsAt) => startsAt.getTime() >= earliestStart)
    .map((startsAt) => ({ startsAt, time: timeInTimeZone(startsAt) }));
}

/**
 * Starts of the consecutive blocks of the day, from the opening, "HH:MM".
 * A block that does not fit whole before the closing is left out.
 */
function blockStarts(openDay: OpenDay, durationMinutes: number): string[] {
  const opens = toMinutes(openDay.opensAt);
  const closes = toMinutes(openDay.closesAt);
  const starts: string[] = [];
  for (let start = opens; start + durationMinutes <= closes; start += durationMinutes) {
    starts.push(fromMinutes(start));
  }
  return starts;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
