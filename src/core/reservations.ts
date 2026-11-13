import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getBusiness } from "@/db/businesses";
import { insertReservation, type BusyTime, type StoredReservation } from "@/db/reservations";
import type { BusinessId } from "@/db/schema";
import { getDayAvailability } from "./available-slots";
import { sendWithoutFailing, type EmailSender } from "./email";
import type { Professional } from "./professionals";
import { confirmationEmail, type ConfirmedReservationDetails } from "./reservation-emails";
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
 * free Professional chosen by the system (Auto-assignment), and the Customer receives the
 * confirmation email. `now` (the clock) and `emailSender` are received from outside so
 * tests can simulate them.
 *
 * Everything the form sends is checked again here: a block outside the Opening hours or
 * the notices is rejected even if the form was forced.
 */
export async function reserve(
  businessId: BusinessId,
  input: NewReservation,
  now: Date,
  emailSender: EmailSender,
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
    if (!reservation) continue;
    await sendConfirmationEmail(emailSender, businessId, reservation, customer);
    return { ok: true, value: reservation };
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

/**
 * Sends the confirmation email without ever failing the Reservation: it is already
 * Confirmed, so a provider problem is only logged.
 */
async function sendConfirmationEmail(
  emailSender: EmailSender,
  businessId: BusinessId,
  reservation: Reservation,
  customer: Pick<ConfirmedReservationDetails, "customerName" | "customerEmail">,
): Promise<void> {
  // The Customer's email stays out of the logs; the Reservation id is enough to find it.
  await sendWithoutFailing(
    emailSender,
    async () => {
      const business = await getBusiness(businessId);
      if (!business) throw new Error("No se encontró el Negocio de la Reserva");
      return confirmationEmail({
        business,
        ...customer,
        startsAt: reservation.startsAt,
        cancellationToken: reservation.cancellationToken,
      });
    },
    `No se pudo enviar el email de confirmación de la Reserva ${reservation.id}:`,
  );
}

/** 32 random bytes in base64url: unguessable, and safe to put in a link. */
function generateCancellationToken(): string {
  return randomBytes(32).toString("base64url");
}
