import { eq } from "drizzle-orm";
import { db } from "./index";
import { businesses, openingHours, type BusinessId } from "./schema";

/** Opening hours of one weekday. Times are "HH:MM", in Argentina time. */
export type OpenDay = { weekday: number; opensAt: string; closesAt: string };

export type ReservationRules = {
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

export async function updateReservationRules(
  businessId: BusinessId,
  rules: ReservationRules,
): Promise<void> {
  await db.update(businesses).set(rules).where(eq(businesses.id, businessId));
}
