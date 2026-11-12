import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "./index";
import {
  reservations,
  type BusinessId,
  type ProfessionalId,
  type ReservationId,
  type ReservationStatus,
} from "./schema";

/** The time a Confirmed Reservation keeps a Professional busy. */
export type BusyTime = { professionalId: ProfessionalId; startsAt: Date; endsAt: Date };

export type NewReservation = {
  businessId: BusinessId;
  professionalId: ProfessionalId;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  cancellationToken: string;
};

export type StoredReservation = {
  id: ReservationId;
  professionalId: ProfessionalId;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  cancellationToken: string;
};

/** Name of the exclusion constraint of drizzle/0003_reservations.sql. */
const NO_OVERLAP_CONSTRAINT = "reservations_no_overlap";

/**
 * The Confirmed Reservations of the Business that overlap [from, to), whichever
 * Professional they belong to.
 */
export async function listBusyTimes(
  businessId: BusinessId,
  from: Date,
  to: Date,
): Promise<BusyTime[]> {
  return db
    .select({
      professionalId: reservations.professionalId,
      startsAt: reservations.startsAt,
      endsAt: reservations.endsAt,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.businessId, businessId),
        eq(reservations.status, "confirmed"),
        lt(reservations.startsAt, to),
        gt(reservations.endsAt, from),
      ),
    );
}

/**
 * Two simultaneous inserts that overlap can each wait for the other inside the exclusion
 * constraint, and Postgres then aborts one with "deadlock detected" instead of an
 * exclusion violation. The aborted insert left nothing behind, and by the time it is
 * retried the other one has finished, so the retry gets a definite answer.
 */
const DEADLOCK_ATTEMPTS = 3;

/**
 * Inserts a Confirmed Reservation. Returns `undefined`, instead of throwing, when the
 * database rejects it because the Professional already has a Confirmed Reservation
 * that overlaps: someone else got there first.
 */
export async function insertReservation(
  reservation: NewReservation,
): Promise<StoredReservation | undefined> {
  for (let attempt = 1; ; attempt++) {
    try {
      const [stored] = await db
        .insert(reservations)
        .values({ ...reservation, status: "confirmed" })
        .returning({
          id: reservations.id,
          professionalId: reservations.professionalId,
          startsAt: reservations.startsAt,
          endsAt: reservations.endsAt,
          status: reservations.status,
          cancellationToken: reservations.cancellationToken,
        });
      return stored;
    } catch (error) {
      const code = postgresErrorCode(error);
      // 23P01: exclusion_violation. Only ours means "taken"; any other is a bug.
      if (code?.value === "23P01" && code.constraint === NO_OVERLAP_CONSTRAINT) return undefined;
      // 40P01: deadlock_detected. Undecided, not taken: try again.
      if (code?.value === "40P01" && attempt < DEADLOCK_ATTEMPTS) continue;
      throw error;
    }
  }
}

/** The Postgres error code, and constraint if any. Drizzle wraps the `pg` error in `cause`. */
function postgresErrorCode(error: unknown): { value: string; constraint?: string } | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    const { code, constraint } = current as { code?: unknown; constraint?: unknown };
    if (typeof code === "string") {
      return { value: code, constraint: typeof constraint === "string" ? constraint : undefined };
    }
  }
  return undefined;
}
