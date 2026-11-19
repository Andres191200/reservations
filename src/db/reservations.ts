import { and, asc, eq, gt, gte, lt, type SQL } from "drizzle-orm";
import { db } from "./index";
import {
  professionals,
  reservations,
  type BusinessId,
  type CancelledBy,
  type CreatedBy,
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
  /** Only the Admin can leave it empty. */
  customerEmail: string | null;
  customerPhone: string | null;
  createdBy: CreatedBy;
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

/**
 * A Reservation as the Customer sees it through their Cancellation link, and as the
 * cancellation email needs it.
 */
export type CustomerReservation = StoredReservation & {
  customerName: string;
  customerEmail: string | null;
  cancelledBy: CancelledBy | null;
};

const storedReservationColumns = {
  id: reservations.id,
  professionalId: reservations.professionalId,
  startsAt: reservations.startsAt,
  endsAt: reservations.endsAt,
  status: reservations.status,
  cancellationToken: reservations.cancellationToken,
};

const customerReservationColumns = {
  ...storedReservationColumns,
  customerName: reservations.customerName,
  customerEmail: reservations.customerEmail,
  cancelledBy: reservations.cancelledBy,
};

/**
 * The Reservation with that cancellation token, only if it belongs to the Business: a
 * token used under another Business's path finds nothing.
 */
export async function findReservationByToken(
  businessId: BusinessId,
  cancellationToken: string,
): Promise<CustomerReservation | undefined> {
  const [reservation] = await db
    .select(customerReservationColumns)
    .from(reservations)
    .where(
      and(
        eq(reservations.businessId, businessId),
        eq(reservations.cancellationToken, cancellationToken),
      ),
    );
  return reservation;
}

/**
 * The Reservation with that id, only if it belongs to the Business: an id of another
 * Business's Reservation finds nothing.
 */
export async function findReservation(
  businessId: BusinessId,
  reservationId: ReservationId,
): Promise<StoredReservation | undefined> {
  const [reservation] = await db
    .select(storedReservationColumns)
    .from(reservations)
    .where(and(eq(reservations.businessId, businessId), eq(reservations.id, reservationId)));
  return reservation;
}

/**
 * Cancellation: turns a Confirmed Reservation of the Business into Cancelled, recording
 * who made it and when. Returns `undefined` when there was nothing to cancel because it
 * was already Cancelled: of two simultaneous Cancellations, only one goes through.
 */
export async function cancelReservation(
  businessId: BusinessId,
  reservationId: ReservationId,
  cancellation: { cancelledBy: CancelledBy; cancelledAt: Date },
): Promise<CustomerReservation | undefined> {
  const [cancelled] = await db
    .update(reservations)
    .set({ status: "cancelled", ...cancellation })
    .where(
      and(
        eq(reservations.businessId, businessId),
        eq(reservations.id, reservationId),
        eq(reservations.status, "confirmed"),
      ),
    )
    .returning(customerReservationColumns);
  return cancelled;
}

/** A Reservation as the Admin sees it in the panel, with the Professional assigned to it. */
export type AdminReservation = {
  id: ReservationId;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  cancelledBy: CancelledBy | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  createdBy: CreatedBy;
  professional: { id: ProfessionalId; name: string };
};

/**
 * The Reservations of the Business, Confirmed or Cancelled, that start in [from, to),
 * sorted by start and then by Professional name. Those of deactivated Professionals are
 * included: they are part of the history.
 */
export async function listReservations(
  businessId: BusinessId,
  from: Date,
  to: Date,
): Promise<AdminReservation[]> {
  return listAdminReservations(
    businessId,
    and(gte(reservations.startsAt, from), lt(reservations.startsAt, to)),
  );
}

/**
 * The Reservations of the Business that meet `condition`, as the Admin sees them, sorted
 * by start and then by Professional name.
 */
export async function listAdminReservations(
  businessId: BusinessId,
  condition: SQL | undefined,
): Promise<AdminReservation[]> {
  return db
    .select({
      id: reservations.id,
      startsAt: reservations.startsAt,
      endsAt: reservations.endsAt,
      status: reservations.status,
      cancelledBy: reservations.cancelledBy,
      customerName: reservations.customerName,
      customerEmail: reservations.customerEmail,
      customerPhone: reservations.customerPhone,
      createdBy: reservations.createdBy,
      professional: { id: professionals.id, name: professionals.name },
    })
    .from(reservations)
    .innerJoin(
      professionals,
      and(
        eq(professionals.id, reservations.professionalId),
        // Redundant with the Reservation's own Business, but keeps the join from ever
        // reaching another Business's Professional.
        eq(professionals.businessId, businessId),
      ),
    )
    .where(and(eq(reservations.businessId, businessId), condition))
    .orderBy(asc(reservations.startsAt), asc(professionals.name), asc(reservations.createdAt));
}

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
 * Two simultaneous writes that overlap can each wait for the other inside the exclusion
 * constraint, and Postgres then aborts one with "deadlock detected" instead of an
 * exclusion violation. The aborted write left nothing behind, and by the time it is
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
  return unlessOverlapping(async () => {
    const [stored] = await db
      .insert(reservations)
      .values({ ...reservation, status: "confirmed" })
      .returning(storedReservationColumns);
    return stored;
  });
}

/**
 * Reassignment: moves a Confirmed Reservation of the Business to another Professional,
 * keeping its time. The database has the last word on whether that Professional is free
 * (exclusion constraint). Returns:
 * - `"reassigned"` when it moved;
 * - `"busy"` when that Professional has a Confirmed Reservation that overlaps;
 * - `"not-confirmed"` when there was no Confirmed Reservation of the Business with that
 *   id (it was Cancelled in the meantime, or never was of this Business).
 */
export async function reassignReservation(
  businessId: BusinessId,
  reservationId: ReservationId,
  professionalId: ProfessionalId,
): Promise<"reassigned" | "busy" | "not-confirmed"> {
  const updated = await unlessOverlapping(() =>
    db
      .update(reservations)
      .set({ professionalId })
      .where(
        and(
          eq(reservations.businessId, businessId),
          eq(reservations.id, reservationId),
          eq(reservations.status, "confirmed"),
        ),
      )
      .returning({ id: reservations.id }),
  );
  if (!updated) return "busy";
  return updated.length > 0 ? "reassigned" : "not-confirmed";
}

/**
 * Runs a write that may put two Confirmed Reservations of the same Professional on top of
 * each other. Returns `undefined`, instead of throwing, when the exclusion constraint
 * rejects it.
 */
async function unlessOverlapping<T>(write: () => Promise<T>): Promise<T | undefined> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
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
