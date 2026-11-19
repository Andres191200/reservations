import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

/**
 * Runs once when the server starts. With NEXT_PUBLIC_SENTRY_DSN (validated in
 * src/lib/env.ts), the server's errors go to Sentry; without it (development, tests),
 * nothing is reported.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (process.env.NEXT_RUNTIME === "nodejs" && dsn) Sentry.init(sentryOptions(dsn));
}

/** Errors of Server Components, route handlers and server actions that nobody handled. */
export const onRequestError = Sentry.captureRequestError;
