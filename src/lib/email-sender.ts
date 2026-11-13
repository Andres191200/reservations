import "server-only";
import type { EmailSender } from "@/core/email";
import { env } from "./env";

/** A provider that does not answer in this time counts as a failed send. */
const TIMEOUT_MS = 10_000;

/** Production: Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
function resendSender(apiKey: string): EmailSender {
  return {
    async send(email) {
      await post("https://api.resend.com/emails", {
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          from: `${quotedName(email.fromName)} <${env.EMAIL_FROM}>`,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          html: email.html,
        },
      });
    },
  };
}

/** Development: Mailpit's send API. The emails show up at MAILPIT_URL instead of going out. */
function mailpitSender(baseUrl: string): EmailSender {
  return {
    async send(email) {
      await post(new URL("/api/v1/send", baseUrl).href, {
        body: {
          From: { Email: env.EMAIL_FROM, Name: email.fromName },
          To: [{ Email: email.to }],
          Subject: email.subject,
          Text: email.text,
          HTML: email.html,
        },
      });
    },
  };
}

async function post(url: string, request: { headers?: Record<string, string>; body: unknown }) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...request.headers },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} respondió ${response.status}: ${await response.text()}`);
  }
}

/** The sender's name in an address header, quoted so commas or "<" in it do no harm. */
function quotedName(name: string): string {
  return `"${name.replace(/["\\\r\n]/g, "")}"`;
}

/** The app's EmailSender, chosen by EMAIL_TRANSPORT. */
export const emailSender: EmailSender =
  env.EMAIL_TRANSPORT === "resend" && env.RESEND_API_KEY
    ? resendSender(env.RESEND_API_KEY)
    : mailpitSender(env.MAILPIT_URL);
