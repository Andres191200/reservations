import { z } from "zod";
import {
  getOpeningHours as getStoredOpeningHours,
  getReservationRules as getStoredReservationRules,
  replaceOpeningHours,
  updateReservationRules,
  type OpenDay,
  type ReservationRules,
} from "@/db/business-configuration";
import type { BusinessId } from "@/db/schema";
import { capitalize } from "./format";
import type { Result } from "./result";
import { weekdayName } from "./weekdays";

export type { OpenDay, ReservationRules };

// --- Opening hours -------------------------------------------------------------------

/** "HH:MM", 24 hours. Zero-padded, so two times compare correctly as strings. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const openDaySchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    opensAt: z.string().trim(),
    closesAt: z.string().trim(),
  })
  .superRefine((day, ctx) => {
    const name = weekdayName(day.weekday);
    if (!TIME.test(day.opensAt) || !TIME.test(day.closesAt)) {
      ctx.addIssue({
        code: "custom",
        message: `${name}: completá la apertura y el cierre con el formato HH:MM.`,
      });
    } else if (day.closesAt <= day.opensAt) {
      ctx.addIssue({
        code: "custom",
        message: `${name}: el cierre tiene que ser posterior a la apertura.`,
      });
    }
  });

const openingHoursSchema = z.array(openDaySchema).superRefine((days, ctx) => {
  const weekdays = days.map((day) => day.weekday);
  if (new Set(weekdays).size !== weekdays.length) {
    ctx.addIssue({ code: "custom", message: "Cada día de la semana puede tener una sola franja." });
  }
});

/** The weekdays the Business is open, from Monday to Sunday. Closed days are not listed. */
export async function getOpeningHours(businessId: BusinessId): Promise<OpenDay[]> {
  return getStoredOpeningHours(businessId);
}

/**
 * Saves the whole week of Opening hours: one continuous range per open day.
 * Days not in `openDays` are closed. If any day is invalid, nothing is saved.
 */
export async function saveOpeningHours(
  businessId: BusinessId,
  openDays: OpenDay[],
): Promise<Result<OpenDay[]>> {
  const parsed = openingHoursSchema.safeParse(openDays);
  if (!parsed.success) return { ok: false, error: errorMessage(parsed.error) };

  const sorted = [...parsed.data].sort((a, b) => a.weekday - b.weekday);
  await replaceOpeningHours(businessId, sorted);
  return { ok: true, value: sorted };
}

// --- Reservation rules ---------------------------------------------------------------

/**
 * A whole number between `min` and `max`. Accepts the text of a form field, so the
 * panel can pass what the Admin typed; an empty field is an error, not a zero.
 */
function wholeNumber(label: string, min: number, max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" ? (value.trim() === "" ? undefined : Number(value)) : value),
    z
      .number({ error: `Completá ${label}.` })
      .int(`${capitalize(label)} tiene que ser un número entero.`)
      .min(min, `${capitalize(label)} tiene que ser al menos ${min}.`)
      .max(max, `${capitalize(label)} no puede ser mayor a ${max}.`),
  );
}

const reservationRulesSchema = z
  .object({
    reservationDurationMinutes: wholeNumber("la Duración de Reserva", 5, 720),
    minimumNoticeHours: wholeNumber("la antelación mínima", 0, 720),
    maximumNoticeDays: wholeNumber("la antelación máxima", 1, 365),
    cancellationDeadlineHours: wholeNumber("el límite de cancelación", 0, 720),
  })
  .refine((rules) => rules.maximumNoticeDays * 24 > rules.minimumNoticeHours, {
    message: "La antelación máxima tiene que ser mayor que la antelación mínima.",
  });

export type ReservationRulesInput = z.input<typeof reservationRulesSchema>;

export async function getReservationRules(businessId: BusinessId): Promise<ReservationRules> {
  const rules = await getStoredReservationRules(businessId);
  if (!rules) throw new Error(`No existe el Negocio ${businessId}.`);
  return rules;
}

/** Saves the Reservation duration, the minimum and maximum notice and the cancellation deadline. */
export async function saveReservationRules(
  businessId: BusinessId,
  input: ReservationRulesInput,
): Promise<Result<ReservationRules>> {
  const parsed = reservationRulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: errorMessage(parsed.error) };

  await updateReservationRules(businessId, parsed.data);
  return { ok: true, value: parsed.data };
}

// --- Helpers -------------------------------------------------------------------------

function errorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("\n");
}
