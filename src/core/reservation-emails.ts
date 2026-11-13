import { env } from "@/lib/env";
import type { Email } from "./email";
import { capitalize, formatDay } from "./format";
import { dayInTimeZone, TIME_ZONE_LABEL, timeInTimeZone } from "./time-zone";

/** Segment of the Cancellation link: app.com/<path>/reserva/<token>. */
const CANCELLATION_SEGMENT = "reserva";

/** The Cancellation link, absolute: it is opened from the Customer's inbox. */
export function cancellationLink(path: string, cancellationToken: string): string {
  // BETTER_AUTH_URL is the base URL of the app, the same one the panel uses.
  return new URL(`/${path}/${CANCELLATION_SEGMENT}/${cancellationToken}`, env.BETTER_AUTH_URL)
    .href;
}

export type ConfirmedReservationDetails = {
  business: { name: string; path: string };
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  cancellationToken: string;
};

/** The email the Customer receives when their Reservation is Confirmed. */
export function confirmationEmail(details: ConfirmedReservationDetails): Email {
  const { business, customerName, startsAt } = details;
  const day = capitalize(formatDay(dayInTimeZone(startsAt)));
  const time = `${timeInTimeZone(startsAt)} (${TIME_ZONE_LABEL})`;
  const link = cancellationLink(business.path, details.cancellationToken);

  const text = [
    `Hola, ${customerName}:`,
    "",
    `Tu Reserva en ${business.name} quedó confirmada.`,
    "",
    `Día: ${day}`,
    `Horario: ${time}`,
    "",
    "Si no podés ir, cancelala desde este link:",
    link,
  ].join("\n");

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family: sans-serif; color: #1a1a1a; line-height: 1.5">
    <p>Hola, ${escapeHtml(customerName)}:</p>
    <p>Tu Reserva en <strong>${escapeHtml(business.name)}</strong> quedó confirmada.</p>
    <p>
      <strong>Día:</strong> ${escapeHtml(day)}<br />
      <strong>Horario:</strong> ${escapeHtml(time)}
    </p>
    <p>Si no podés ir, <a href="${escapeHtml(link)}">cancelá tu Reserva desde este link</a>.</p>
  </body>
</html>`;

  return {
    to: details.customerEmail,
    fromName: business.name,
    subject: `Reserva confirmada en ${business.name}: ${day}, ${timeInTimeZone(startsAt)}`,
    text,
    html,
  };
}

/** The Customer's name and the Business's name are typed by people: never trust them as HTML. */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
