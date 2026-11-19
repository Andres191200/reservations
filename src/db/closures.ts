import { and, asc, eq, exists, gte, sql } from "drizzle-orm";
import { db } from "./index";
import { listAdminReservations, type AdminReservation } from "./reservations";
import { closures, reservations, type BusinessId, type ClosureId } from "./schema";

/** Time zone of the Business's days, the same as src/core/time-zone.ts. */
const TIME_ZONE = "America/Argentina/Buenos_Aires";

export type Closure = { id: ClosureId; day: string };

const closureColumns = { id: closures.id, day: closures.day };

/**
 * Adds the Closure of `day` to the Business. Returns `undefined` when the Business
 * already has a Closure that day.
 */
export async function insertClosure(
  businessId: BusinessId,
  day: string,
): Promise<Closure | undefined> {
  const [closure] = await db
    .insert(closures)
    .values({ businessId, day })
    .onConflictDoNothing()
    .returning(closureColumns);
  return closure;
}

/** Deletes the Closure if it belongs to the Business. Returns whether it did. */
export async function deleteClosure(
  businessId: BusinessId,
  closureId: ClosureId,
): Promise<boolean> {
  const deleted = await db
    .delete(closures)
    .where(and(eq(closures.businessId, businessId), eq(closures.id, closureId)))
    .returning({ id: closures.id });
  return deleted.length > 0;
}

/** The Closures of the Business from `fromDay` on, by day. */
export async function listClosures(businessId: BusinessId, fromDay: string): Promise<Closure[]> {
  return db
    .select(closureColumns)
    .from(closures)
    .where(and(eq(closures.businessId, businessId), gte(closures.day, fromDay)))
    .orderBy(asc(closures.day));
}

export async function hasClosure(businessId: BusinessId, day: string): Promise<boolean> {
  const [closure] = await db
    .select({ id: closures.id })
    .from(closures)
    .where(and(eq(closures.businessId, businessId), eq(closures.day, day)));
  return closure !== undefined;
}

/**
 * The Confirmed Reservations of the Business that start, in Argentina, on a day with a
 * Closure of the same Business, from `fromDay` on.
 */
export async function listConfirmedReservationsOnClosures(
  businessId: BusinessId,
  fromDay: string,
): Promise<AdminReservation[]> {
  const startDay = sql`(${reservations.startsAt} AT TIME ZONE ${TIME_ZONE})::date`;
  return listAdminReservations(
    businessId,
    and(
      eq(reservations.status, "confirmed"),
      sql`${startDay} >= ${fromDay}::date`,
      exists(
        db
          .select({ id: closures.id })
          .from(closures)
          .where(and(eq(closures.businessId, businessId), sql`${closures.day} = ${startDay}`)),
      ),
    ),
  );
}
