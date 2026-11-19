import { and, asc, eq, exists, gte, lte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  listAdminReservations,
  reservationStartDay,
  type AdminReservation,
} from "./reservations";
import {
  absences,
  professionals,
  reservations,
  type AbsenceId,
  type BusinessId,
  type ProfessionalId,
} from "./schema";

export type Absence = {
  id: AbsenceId;
  professional: { id: ProfessionalId; name: string };
  /** "YYYY-MM-DD". */
  startsOn: string;
  /** "YYYY-MM-DD", included. */
  endsOn: string;
};

export async function insertAbsence(
  businessId: BusinessId,
  absence: { professionalId: ProfessionalId; startsOn: string; endsOn: string },
): Promise<AbsenceId> {
  const [inserted] = await db
    .insert(absences)
    .values({ businessId, ...absence })
    .returning({ id: absences.id });
  return inserted.id;
}

/** Deletes the Absence if it belongs to the Business. Returns whether it did. */
export async function deleteAbsence(
  businessId: BusinessId,
  absenceId: AbsenceId,
): Promise<boolean> {
  const deleted = await db
    .delete(absences)
    .where(and(eq(absences.businessId, businessId), eq(absences.id, absenceId)))
    .returning({ id: absences.id });
  return deleted.length > 0;
}

/**
 * The Absences of the Business that touch [fromDay, toDay] (both included; without
 * `toDay`, every one that has not ended before `fromDay`), by start and Professional name.
 * With `professionalId`, only that Professional's.
 */
export async function listAbsences(
  businessId: BusinessId,
  range: { fromDay: string; toDay?: string; professionalId?: ProfessionalId },
): Promise<Absence[]> {
  return db
    .select({
      id: absences.id,
      professional: { id: professionals.id, name: professionals.name },
      startsOn: absences.startsOn,
      endsOn: absences.endsOn,
    })
    .from(absences)
    .innerJoin(
      professionals,
      and(
        eq(professionals.id, absences.professionalId),
        eq(professionals.businessId, businessId),
      ),
    )
    .where(
      and(
        eq(absences.businessId, businessId),
        gte(absences.endsOn, range.fromDay),
        range.toDay ? lte(absences.startsOn, range.toDay) : undefined,
        range.professionalId ? eq(absences.professionalId, range.professionalId) : undefined,
      ),
    )
    .orderBy(asc(absences.startsOn), asc(professionals.name));
}

/**
 * The Confirmed Reservations of the Business, from `fromDay` on, that start (in
 * Argentina) on a day their Professional is Absent. With `absenceId`, only that Absence.
 */
export async function listConfirmedReservationsInAbsences(
  businessId: BusinessId,
  fromDay: string,
  absenceId?: AbsenceId,
): Promise<AdminReservation[]> {
  return listAdminReservations(
    businessId,
    and(
      eq(reservations.status, "confirmed"),
      sql`${reservationStartDay} >= ${fromDay}::date`,
      exists(
        db
          .select({ id: absences.id })
          .from(absences)
          .where(
            and(
              eq(absences.businessId, businessId),
              eq(absences.professionalId, reservations.professionalId),
              absenceId ? eq(absences.id, absenceId) : undefined,
              sql`${reservationStartDay} BETWEEN ${absences.startsOn} AND ${absences.endsOn}`,
            ),
          ),
      ),
    ),
  );
}
