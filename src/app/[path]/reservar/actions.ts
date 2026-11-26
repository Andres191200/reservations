"use server";

import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { reserve, SLOT_TAKEN_ERROR } from "@/core/reservations";
import type { FieldErrors } from "@/core/result";
import { findBusinessByPath } from "@/db/businesses";
import { withUnexpectedErrors } from "@/lib/action-errors";
import { clientIp } from "@/lib/client-ip";
import { emailSender } from "@/lib/email-sender";
import { createRateLimiter } from "@/lib/rate-limiter";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { TURNSTILE_FAILED_ERROR, TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile-form";
import { reservationHref } from "../format";

const RESERVATIONS_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Reservations created from the public page by each IP in the last hour, so nobody fills
 * a Business's Agenda. In the server's memory: one instance of the app is enough. Only the
 * public page goes through it; the Reservations the Admin enters do not.
 */
const reservationsPerIp = createRateLimiter({
  limit: RESERVATIONS_PER_HOUR,
  windowMs: HOUR_MS,
});

/** What the Customer typed, so it comes back after a rejection. */
export type CustomerFields = { name: string; email: string; phone: string };

export type ReserveState = {
  /** What is not about one field: shown above the button. */
  error?: string;
  /** What is about one field, shown beside it. */
  fieldErrors?: Partial<CustomerFields>;
  /** The block filled up meanwhile: the Customer has to choose another one. */
  slotTaken?: boolean;
  fields?: CustomerFields;
};

/**
 * Creates the Reservation of the public page. `path` and `startsAt` come from the page
 * the Customer was on; the core checks them again, so forcing them changes nothing.
 *
 * Before calling the core, the public page's protections: Turnstile's token must be
 * valid, and the IP must not have reached the hourly limit of Reservations. Only created
 * Reservations count toward the limit: a rejected one gives its place back.
 *
 * A created Reservation ends on its own page (the one of the Cancellation link), marked as
 * just created so it greets the Customer once. It replaces the form in the history: going
 * back leads to the day, not to a form already sent.
 */
export async function reserveSlot(
  path: string,
  startsAt: string,
  _previous: ReserveState,
  formData: FormData,
): Promise<ReserveState> {
  const fields: CustomerFields = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };

  return withUnexpectedErrors(async () => {
    const business = await findBusinessByPath(path);
    if (!business) return { error: "Este negocio no existe.", fields };

    const ip = clientIp(await headers());
    const turnstileToken = String(formData.get(TURNSTILE_TOKEN_FIELD) ?? "");
    if (!(await verifyTurnstileToken(turnstileToken, ip))) {
      return { error: TURNSTILE_FAILED_ERROR, fields };
    }

    const now = new Date();
    // Behind the proxy there is always an IP; if not, those requests share one limit.
    const rateLimit = reservationsPerIp.take(ip ?? "unknown", now);
    if (!rateLimit.allowed) {
      return { error: rateLimitError(rateLimit.retryAt, now), fields };
    }

    const result = await reserve(
      business.id,
      {
        startsAt,
        customerName: fields.name,
        customerEmail: fields.email,
        customerPhone: fields.phone,
      },
      now,
      emailSender,
    ).catch((error: unknown) => {
      rateLimit.release();
      throw error;
    });
    if (!result.ok) {
      rateLimit.release();
      if (result.fieldErrors) return { ...byFormField(result.fieldErrors), fields };
      return { error: result.error, slotTaken: result.error === SLOT_TAKEN_ERROR, fields };
    }

    redirect(
      reservationHref(path, result.value.cancellationToken, { justCreated: true }),
      RedirectType.replace,
    );
  }, { fields });
}

/** The form's name for each field of the core's input that the Customer fills. */
const FORM_FIELDS: Record<string, keyof CustomerFields> = {
  customerName: "name",
  customerEmail: "email",
  customerPhone: "phone",
};

/** The messages of the Customer's fields go beside them; any other one, above the button. */
function byFormField(fieldErrors: FieldErrors): Pick<ReserveState, "error" | "fieldErrors"> {
  const byField: Partial<CustomerFields> = {};
  const others: string[] = [];
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (!message) continue;
    if (FORM_FIELDS[field]) byField[FORM_FIELDS[field]] = message;
    else others.push(message);
  }
  return { fieldErrors: byField, ...(others.length > 0 && { error: others.join("\n") }) };
}

function rateLimitError(retryAt: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / 60_000));
  return (
    `Se alcanzó el límite de ${RESERVATIONS_PER_HOUR} Reservas por hora desde tu conexión. ` +
    `Vas a poder reservar de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`
  );
}
