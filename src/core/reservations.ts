import { randomBytes } from "node:crypto";
import { z } from "zod";
import { insertReservation, type BusyTime, type StoredReservation } from "@/db/reservations";
import type { BusinessId } from "@/db/schema";
import { getDayAvailability } from "./available-slots";
import type { Professional } from "./professionals";
import type { Result } from "./result";
import { dayInTimeZone } from "./time-zone";

export type Reservation = StoredReservation;

const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const PHONE_MAX_LENGTH = 30;

/** Shown when the block filled up between choosing it and confirming. */
export const SLOT_TAKEN_ERROR = "Ese horario se acaba de ocupar. Elegí otro.";

/** Shown when the block is not one the Customer can reserve (rules, Opening hours). */
export const SLOT_NOT_RESERVABLE_ERROR = "Ese horario no se puede reservar. Elegí otro.";

const newReservationSchema = z.object({
  /** Start of the chosen Available slot, as an ISO instant (what the public page sends). */
  startsAt: z.iso.datetime({ offset: true, error: SLOT_NOT_RESERVABLE_ERROR }),
  customerName: z
    .string()
    .trim()
    .min(1, "Completá tu nombre.")
    .max(NAME_MAX_LENGTH, `El nombre puede tener hasta ${NAME_MAX_LENGTH} letras.`),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Completá tu email.")
    .max(EMAIL_MAX_LENGTH, "El email es demasiado largo.")
    .pipe(z.email("El email no es válido.")),
  customerPhone: z
    .string()
    .trim()
    .max(PHONE_MAX_LENGTH, `El teléfono puede tener hasta ${PHONE_MAX_LENGTH} caracteres.`)
    .regex(/^[0-9+()\s-]*$/, "El teléfono solo puede tener números, espacios, +, - y paréntesis.")
    .optional()
    .transform((phone) => phone || null),
});

export type NewReservation = z.input<typeof newReservationSchema>;

/**
 * A Customer reserves an Available slot. The Reservation is born Confirmed and goes to a
 * free Professional chosen by the system (Auto-assignment). `now` is the clock, received
 * from outside so tests can simulate it.
 *
 * Everything the form sends is checked again here: a block outside the Opening hours or
 * the notices is rejected even if the form was forced.
 */
export async function reserve(
  businessId: BusinessId,
  input: NewReservation,
  now: Date,
): Promise<Result<Reservation>> {
  const parsed = newReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("\n") };
  }
  const { startsAt: requestedStart, ...customer } = parsed.data;
  const startsAt = new Date(requestedStart);

  const { blocks, busyTimes } = await getDayAvailability(
    businessId,
    dayInTimeZone(startsAt),
    now,
  );
  const block = blocks.find((candidate) => candidate.startsAt.getTime() === startsAt.getTime());
  if (!block) return { ok: false, error: SLOT_NOT_RESERVABLE_ERROR };

  const cancellationToken = generateCancellationToken();

  // What was free when reading may be taken by the time of writing. The database has the
  // last word (exclusion constraint): if it rejects a Professional, try the next one.
  for (const professional of byAssignmentPreference(block.freeProfessionals, busyTimes)) {
    const reservation = await insertReservation({
      businessId,
      professionalId: professional.id,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      ...customer,
      cancellationToken,
    });
    if (reservation) return { ok: true, value: reservation };
  }

  return { ok: false, error: SLOT_TAKEN_ERROR };
}

/**
 * Auto-assignment criterion: among the free Professionals, first the one with the fewest
 * Confirmed Reservations that day, so the work is spread across the team. A tie keeps the
 * order received (by name).
 */
export function byAssignmentPreference(
  freeProfessionals: Professional[],
  busyTimesOfTheDay: BusyTime[],
): Professional[] {
  const reservationsOf = (professional: Professional) =>
    busyTimesOfTheDay.filter((busy) => busy.professionalId === professional.id).length;
  return freeProfessionals
    .map((professional) => ({ professional, reservations: reservationsOf(professional) }))
    .sort((a, b) => a.reservations - b.reservations)
    .map(({ professional }) => professional);
}

/** 32 random bytes in base64url: unguessable, and safe to put in a link. */
function generateCancellationToken(): string {
  return randomBytes(32).toString("base64url");
}
