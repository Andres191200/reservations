import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getBusiness } from "@/db/businesses";
import { insertReservation, type BusyTime, type StoredReservation } from "@/db/reservations";
import type { BusinessId, CreatedBy, ProfessionalId } from "@/db/schema";
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

/** Shown when the Admin chooses a Professional that is not active in the Business. */
export const PROFESSIONAL_NOT_FOUND_ERROR = "Ese Profesional no existe o está dado de baja.";

/** Shown when the Professional the Admin chose already has a Reservation at that time. */
export function professionalBusyError(name: string): string {
  return `${name} ya tiene una Reserva en ese horario. Elegí otro Profesional o dejá que se asigne solo.`;
}

const startsAtField = z.iso.datetime({ offset: true, error: SLOT_NOT_RESERVABLE_ERROR });

function customerNameField(emptyMessage: string) {
  return z
    .string()
    .trim()
    .min(1, emptyMessage)
    .max(NAME_MAX_LENGTH, `El nombre puede tener hasta ${NAME_MAX_LENGTH} letras.`);
}

const customerEmailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, "El email es demasiado largo.");

const customerPhoneField = z
  .string()
  .trim()
  .max(PHONE_MAX_LENGTH, `El teléfono puede tener hasta ${PHONE_MAX_LENGTH} caracteres.`)
  .regex(/^[0-9+()\s-]*$/, "El teléfono solo puede tener números, espacios, +, - y paréntesis.")
  .optional()
  .transform((phone) => phone || null);

const newReservationSchema = z.object({
  /** Start of the chosen Available slot, as an ISO instant (what the public page sends). */
  startsAt: startsAtField,
  customerName: customerNameField("Completá tu nombre."),
  customerEmail: customerEmailField
    .min(1, "Completá tu email.")
    .pipe(z.email("El email no es válido.")),
  customerPhone: customerPhoneField,
});

export type NewReservation = z.input<typeof newReservationSchema>;

const newAdminReservationSchema = z.object({
  /** Start of the chosen Available slot, as an ISO instant (what the panel sends). */
  startsAt: startsAtField,
  customerName: customerNameField("Completá el nombre del Cliente."),
  customerEmail: customerEmailField
    .pipe(z.union([z.literal(""), z.email("El email no es válido.")]))
    .optional()
    .transform((email) => email || null),
  customerPhone: customerPhoneField,
  /** Empty: Auto-assignment. */
  professionalId: z
    .union([z.literal(""), z.uuid({ error: PROFESSIONAL_NOT_FOUND_ERROR })])
    .optional()
    .transform((id) => (id ? (id as ProfessionalId) : undefined)),
});

export type NewAdminReservation = z.input<typeof newAdminReservationSchema>;

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
  if (!parsed.success) return { ok: false, error: issuesOf(parsed.error) };
  const { startsAt, ...customer } = parsed.data;

  return createReservation(
    businessId,
    { startsAt: new Date(startsAt), customer, createdBy: "customer" },
    now,
    emailSender,
  );
}

/**
 * The Admin enters a Reservation from the panel, for one the Customer asked for by
 * another channel (WhatsApp, phone). The same rules as for the Customer apply: only an
 * Available slot of the Opening hours, within the notices. The email is optional.
 *
 * The Admin may choose the Professional; it is rejected if that Professional is already
 * busy at that time. Without one, Auto-assignment applies. With an email, the Customer
 * receives the confirmation email with the Cancellation link; without one, nothing is sent.
 */
export async function reserveByAdmin(
  businessId: BusinessId,
  input: NewAdminReservation,
  now: Date,
  emailSender: EmailSender,
): Promise<Result<Reservation>> {
  const parsed = newAdminReservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: issuesOf(parsed.error) };
  const { startsAt, professionalId, ...customer } = parsed.data;

  return createReservation(
    businessId,
    { startsAt: new Date(startsAt), customer, createdBy: "admin", professionalId },
    now,
    emailSender,
  );
}

type CustomerData = {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
};

/**
 * Creates the Confirmed Reservation for the block that starts at `startsAt`, if the
 * rules allow reserving it. With `professionalId`, only that Professional; without it,
 * Auto-assignment.
 */
async function createReservation(
  businessId: BusinessId,
  request: {
    startsAt: Date;
    customer: CustomerData;
    createdBy: CreatedBy;
    professionalId?: ProfessionalId;
  },
  now: Date,
  emailSender: EmailSender,
): Promise<Result<Reservation>> {
  const { startsAt, customer, createdBy, professionalId } = request;

  const { blocks, busyTimes, professionals } = await getDayAvailability(
    businessId,
    dayInTimeZone(startsAt),
    now,
  );
  const block = blocks.find((candidate) => candidate.startsAt.getTime() === startsAt.getTime());
  if (!block) return { ok: false, error: SLOT_NOT_RESERVABLE_ERROR };

  let candidates: Professional[];
  let takenError: string;
  if (professionalId) {
    const chosen = professionals.find((professional) => professional.id === professionalId);
    if (!chosen) return { ok: false, error: PROFESSIONAL_NOT_FOUND_ERROR };
    candidates = block.freeProfessionals.filter((free) => free.id === chosen.id);
    takenError = professionalBusyError(chosen.name);
  } else {
    candidates = byAssignmentPreference(block.freeProfessionals, busyTimes);
    takenError = SLOT_TAKEN_ERROR;
  }

  const cancellationToken = generateCancellationToken();

  // What was free when reading may be taken by the time of writing. The database has the
  // last word (exclusion constraint): if it rejects a Professional, try the next one.
  for (const professional of candidates) {
    const reservation = await insertReservation({
      businessId,
      professionalId: professional.id,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      ...customer,
      createdBy,
      cancellationToken,
    });
    if (!reservation) continue;
    if (customer.customerEmail) {
      await sendConfirmationEmail(emailSender, businessId, reservation, {
        customerName: customer.customerName,
        customerEmail: customer.customerEmail,
      });
    }
    return { ok: true, value: reservation };
  }

  return { ok: false, error: takenError };
}

function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("\n");
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
