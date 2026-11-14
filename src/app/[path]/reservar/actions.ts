"use server";

import { headers } from "next/headers";
import { capitalize, formatDay } from "@/core/format";
import { reserve, SLOT_TAKEN_ERROR } from "@/core/reservations";
import { dayInTimeZone, timeInTimeZone } from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { clientIp } from "@/lib/client-ip";
import { emailSender } from "@/lib/email-sender";
import { createRateLimiter } from "@/lib/rate-limiter";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { TURNSTILE_FAILED_ERROR, TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile-form";

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
  error?: string;
  /** The block filled up meanwhile: the Customer has to choose another one. */
  slotTaken?: boolean;
  fields?: CustomerFields;
  /** The Confirmed Reservation, as the confirmation screen shows it. */
  confirmed?: { day: string; time: string };
};

/**
 * Creates the Reservation of the public page. `path` and `startsAt` come from the page
 * the Customer was on; the core checks them again, so forcing them changes nothing.
 *
 * Before calling the core, the public page's protections: Turnstile's token must be
 * valid, and the IP must not have reached the hourly limit of Reservations. Only created
 * Reservations count toward the limit: a rejected one gives its place back.
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

  const business = await findBusinessByPath(path);
  if (!business) return { error: "Este Negocio no existe.", fields };

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
    return { error: result.error, slotTaken: result.error === SLOT_TAKEN_ERROR, fields };
  }

  const reservedAt = result.value.startsAt;
  return {
    confirmed: {
      day: capitalize(formatDay(dayInTimeZone(reservedAt))),
      time: timeInTimeZone(reservedAt),
    },
  };
}

function rateLimitError(retryAt: Date, now: Date): string {
  const minutes = Math.max(1, Math.ceil((retryAt.getTime() - now.getTime()) / 60_000));
  return (
    `Se alcanzó el límite de ${RESERVATIONS_PER_HOUR} Reservas por hora desde tu conexión. ` +
    `Vas a poder reservar de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`
  );
}
