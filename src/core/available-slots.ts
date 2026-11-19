import type { OpenDay, ReservationRules } from "@/db/business-configuration";
import { listBusyTimes, type BusyTime } from "@/db/reservations";
import type { BusinessId } from "@/db/schema";
import { getAbsentProfessionals } from "./absences";
import { getOpeningHours, getReservationRules } from "./business-configuration";
import { isClosed } from "./closures";
import { getActiveProfessionals, type Professional } from "./professionals";
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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

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
 * the clock `now`: the blocks the Reservation rules allow reserving in which at least one
 * active Professional, not Absent that day, has no Confirmed Reservation. A day with a
 * Closure, outside the Reservable days, or not a valid day, has none.
 */
export async function getAvailableSlots(
  businessId: BusinessId,
  day: string,
  now: Date,
): Promise<AvailableSlot[]> {
  const { blocks } = await getDayAvailability(businessId, day, now);
  return blocks
    .filter((block) => block.freeProfessionals.length > 0)
    .map(({ startsAt, time }) => ({ startsAt, time }));
}

/** An Available slot as the Admin sees it: with the Professionals still free in it. */
export type AvailableSlotWithProfessionals = AvailableSlot & {
  freeProfessionals: Professional[];
};

/**
 * The Available slots of `day`, like `getAvailableSlots`, each with its free
 * Professionals (by name), so the Admin can choose one when entering a Reservation.
 */
export async function getAvailableSlotsWithProfessionals(
  businessId: BusinessId,
  day: string,
  now: Date,
): Promise<AvailableSlotWithProfessionals[]> {
  const { blocks } = await getDayAvailability(businessId, day, now);
  return blocks
    .filter((block) => block.freeProfessionals.length > 0)
    .map(({ startsAt, time, freeProfessionals }) => ({ startsAt, time, freeProfessionals }));
}

/**
 * A block of the Opening hours that the Reservation rules allow reserving, with the
 * active Professionals, not Absent that day, that have no Confirmed Reservation
 * overlapping it.
 * When `freeProfessionals` is empty, the block is full: it is not an Available slot.
 */
export type Block = AvailableSlot & { endsAt: Date; freeProfessionals: Professional[] };

/**
 * Every block of `day` the Reservation rules allow reserving, full or not (none on a day
 * with a Closure), plus the Confirmed Reservations of that day, the active Professionals
 * that serve that day and those Absent that day. Used by the Available slots and by the
 * creation of a Reservation, so both decide with the same rules.
 */
export async function getDayAvailability(
  businessId: BusinessId,
  day: string,
  now: Date,
): Promise<{
  blocks: Block[];
  busyTimes: BusyTime[];
  professionals: Professional[];
  absent: Professional[];
}> {
  if (!isCalendarDay(day)) return { blocks: [], busyTimes: [], professionals: [], absent: [] };

  const [closed, openingHours, rules, active, absentOn, busyTimes] = await Promise.all([
    isClosed(businessId, day),
    getOpeningHours(businessId),
    getReservationRules(businessId),
    getActiveProfessionals(businessId),
    getAbsentProfessionals(businessId, day),
    listBusyTimes(
      businessId,
      instantInTimeZone(day, "00:00"),
      instantInTimeZone(addDays(day, 1), "00:00"),
    ),
  ]);
  // An Absent Professional takes one Reservation less from each block (ADR 0001).
  const absentIds = absentOn(day);
  const professionals = active.filter((professional) => !absentIds.has(professional.id));
  const absent = active.filter((professional) => absentIds.has(professional.id));
  const blocks = closed
    ? []
    : computeBlocks({ day, now, openingHours, rules, professionals, busyTimes });
  return { blocks, busyTimes, professionals, absent };
}

/** The calculation itself, without reading the database. */
function computeBlocks(input: {
  day: CalendarDay;
  now: Date;
  openingHours: OpenDay[];
  rules: ReservationRules;
  professionals: Professional[];
  busyTimes: BusyTime[];
}): Block[] {
  const { day, now, openingHours, rules, professionals, busyTimes } = input;

  const { first, last } = getReservableDays(rules, now);
  if (day < first || day > last) return [];

  const openDay = openingHours.find((open) => open.weekday === weekdayOf(day));
  if (!openDay) return [];

  // Each block accepts as many Reservations as free Professionals (ADR 0001).
  if (professionals.length === 0) return [];

  const earliestStart = now.getTime() + rules.minimumNoticeHours * HOUR_MS;
  const durationMs = rules.reservationDurationMinutes * MINUTE_MS;

  return blockStarts(openDay, rules.reservationDurationMinutes)
    .map((time) => instantInTimeZone(day, time))
    .filter((startsAt) => startsAt.getTime() >= earliestStart)
    .map((startsAt) => {
      const endsAt = new Date(startsAt.getTime() + durationMs);
      const isBusy = (professional: Professional) =>
        busyTimes.some(
          (busy) =>
            busy.professionalId === professional.id &&
            busy.startsAt < endsAt &&
            busy.endsAt > startsAt,
        );
      return {
        startsAt,
        endsAt,
        time: timeInTimeZone(startsAt),
        freeProfessionals: professionals.filter((professional) => !isBusy(professional)),
      };
    });
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
