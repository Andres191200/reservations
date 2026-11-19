import { unstable_rethrow } from "next/navigation";
import { reportError } from "./error-reporting";

/** What a form says when its action fails for a reason that is not the user's. */
export const UNEXPECTED_ERROR = "Algo falló de nuestro lado. Probá de nuevo en un rato.";

/**
 * Runs a server action so an unexpected failure (the database is down, a bug) becomes a
 * message in the form instead of breaking the screen. The error is logged and reported to
 * Sentry for us; the user never sees its details. Next.js's own signals (`redirect`, `notFound`) go through.
 * `keep` is what the form needs back to not lose what the user typed.
 */
export async function withUnexpectedErrors<S extends { error?: string }>(
  run: () => Promise<S>,
  keep: Partial<S> = {},
): Promise<S> {
  try {
    return await run();
  } catch (error) {
    unstable_rethrow(error);
    reportError("Error inesperado en una acción:", error);
    return { ...keep, error: UNEXPECTED_ERROR } as S;
  }
}
