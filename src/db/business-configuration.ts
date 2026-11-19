import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "./index";
import {
  businesses,
  openingHours,
  reservationDurationChanges,
  type BusinessId,
} from "./schema";

/** Opening hours of one weekday. Times are "HH:MM", in Argentina time. */
export type OpenDay = { weekday: number; opensAt: string; closesAt: string };

export type ReservationRules = {
  /** The Reservation duration until its first change. */
  reservationDurationMinutes: number;
  minimumNoticeHours: number;
  maximumNoticeDays: number;
  cancellationDeadlineHours: number;
};

const ruleColumns = {
  reservationDurationMinutes: businesses.reservationDurationMinutes,
  minimumNoticeHours: businesses.minimumNoticeHours,
  maximumNoticeDays: businesses.maximumNoticeDays,
  cancellationDeadlineHours: businesses.cancellationDeadlineHours,
};

/** The weekdays the Business is open, from Monday to Sunday. Closed days are not listed. */
export async function getOpeningHours(businessId: BusinessId): Promise<OpenDay[]> {
  const rows = await db
    .select({
      weekday: openingHours.weekday,
      opensAt: openingHours.opensAt,
      closesAt: openingHours.closesAt,
    })
    .from(openingHours)
    .where(eq(openingHours.businessId, businessId))
    .orderBy(openingHours.weekday);
  // Postgres returns `time` as "HH:MM:SS"; the app works with "HH:MM".
  return rows.map((row) => ({
    weekday: row.weekday,
    opensAt: row.opensAt.slice(0, 5),
    closesAt: row.closesAt.slice(0, 5),
  }));
}

/** Replaces the whole week of the Business: days not in `openDays` become closed. */
export async function replaceOpeningHours(
  businessId: BusinessId,
  openDays: OpenDay[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(openingHours).where(eq(openingHours.businessId, businessId));
    if (openDays.length > 0) {
      await tx.insert(openingHours).values(openDays.map((day) => ({ businessId, ...day })));
    }
  });
}

export async function getReservationRules(
  businessId: BusinessId,
): Promise<ReservationRules | undefined> {
  const [rules] = await db.select(ruleColumns).from(businesses).where(eq(businesses.id, businessId));
  return rules;
}

/** Saves the rules that apply right away: everything but the Reservation duration. */
export async function updateReservationRules(
  businessId: BusinessId,
  rules: Omit<ReservationRules, "reservationDurationMinutes">,
): Promise<void> {
  await db.update(businesses).set(rules).where(eq(businesses.id, businessId));
}

/** A change of the Reservation duration: from `effectiveFrom` on, `minutes`. */
export type ReservationDurationChange = { effectiveFrom: string; minutes: number };

/** Every change of the Business's Reservation duration, by day. */
export async function listReservationDurationChanges(
  businessId: BusinessId,
): Promise<ReservationDurationChange[]> {
  return db
    .select({
      effectiveFrom: reservationDurationChanges.effectiveFrom,
      minutes: reservationDurationChanges.minutes,
    })
    .from(reservationDurationChanges)
    .where(eq(reservationDurationChanges.businessId, businessId))
    .orderBy(asc(reservationDurationChanges.effectiveFrom));
}

/**
 * Replaces the changes from `effectiveFrom` on with one of `minutes` (or with none, when
 * `minutes` is null): the duration of those days goes back to the previous one.
 */
export async function replaceReservationDurationFrom(
  businessId: BusinessId,
  effectiveFrom: string,
  minutes: number | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(reservationDurationChanges)
      .where(
        and(
          eq(reservationDurationChanges.businessId, businessId),
          gte(reservationDurationChanges.effectiveFrom, effectiveFrom),
        ),
      );
    if (minutes !== null) {
      await tx.insert(reservationDurationChanges).values({ businessId, effectiveFrom, minutes });
    }
  });
}
