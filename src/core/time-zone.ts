/**
 * The only time zone of the platform (there is no zone selector in the MVP).
 * Every hour the Admin enters or a Customer sees is in this zone; instants are stored
 * in UTC and converted with this zone, never with a fixed -3 offset.
 * This is the single place where the zone is defined: import it instead of repeating it.
 */
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** How the zone is named in the texts users read. */
export const TIME_ZONE_LABEL = "hora de Argentina";

/** A calendar day, "YYYY-MM-DD", with no time zone attached. */
export type CalendarDay = string;

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** The wall-clock date and time in Argentina at that instant. */
function zonedParts(instant: Date) {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    second: Number(parts.second),
  };
}

/** The day it is in Argentina at that instant. */
export function dayInTimeZone(instant: Date): CalendarDay {
  return zonedParts(instant).day;
}

/** The "HH:MM" it is in Argentina at that instant. */
export function timeInTimeZone(instant: Date): string {
  return zonedParts(instant).time;
}

/** The instant (UTC) of a wall-clock date and "HH:MM" in Argentina. */
export function instantInTimeZone(day: CalendarDay, time: string): Date {
  const [year, month, date] = parseDay(day);
  const [hour, minute] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, date, hour, minute);

  // Guess with the offset at the wall-clock time read as UTC, then correct once with the
  // offset at the guess, in case a daylight saving change sits between both.
  let instant = wallClockAsUtc - offsetAt(new Date(wallClockAsUtc));
  instant = wallClockAsUtc - offsetAt(new Date(instant));
  return new Date(instant);
}

/** Milliseconds Argentina is ahead of UTC at that instant (negative: it is behind). */
function offsetAt(instant: Date): number {
  const { day, time, second } = zonedParts(instant);
  const [year, month, date] = parseDay(day);
  const [hour, minute] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, date, hour, minute, second);
  return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

// --- Calendar days -------------------------------------------------------------------

export function isCalendarDay(text: string): text is CalendarDay {
  const match = CALENDAR_DAY.exec(text);
  if (!match) return false;
  const [year, month, date] = parseDay(text);
  const asDate = new Date(Date.UTC(year, month - 1, date));
  // Rejects days that do not exist, like 2026-02-30.
  return asDate.getUTCMonth() === month - 1 && asDate.getUTCDate() === date;
}

export function addDays(day: CalendarDay, days: number): CalendarDay {
  const [year, month, date] = parseDay(day);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** ISO weekday of the day: 1 = Monday ... 7 = Sunday. */
export function weekdayOf(day: CalendarDay): number {
  const [year, month, date] = parseDay(day);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay() || 7;
}

function parseDay(day: CalendarDay): [number, number, number] {
  const [year, month, date] = day.split("-").map(Number);
  return [year, month, date];
}
