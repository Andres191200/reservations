import * as Sentry from "@sentry/nextjs";

/**
 * Records an error that was handled (so nobody else will report it): in the server's log
 * and, when Sentry is configured, in Sentry. Without a DSN, Sentry is never initialized
 * and `captureException` does nothing.
 */
export function reportError(message: string, error: unknown): void {
  console.error(message, error);
  Sentry.captureException(error, { extra: { message } });
}
