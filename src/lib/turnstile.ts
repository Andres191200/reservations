import "server-only";
import { z } from "zod";
import { env } from "./env";

/** Cloudflare's check of a token (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). */
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Longer tokens are not valid; Cloudflare's own limit. */
const TOKEN_MAX_LENGTH = 2048;

/** If Cloudflare does not answer in this time, the token counts as not valid. */
const TIMEOUT_MS = 10_000;

const siteverifyResponseSchema = z.object({
  success: z.boolean(),
  "error-codes": z.array(z.string()).optional(),
});

/**
 * Asks Cloudflare whether the Turnstile token the form sent is valid. A token works only
 * once and for 5 minutes. If Cloudflare cannot be reached, it is rejected too (and the
 * problem is logged): without the check, a bot would go through.
 */
export async function verifyTurnstileToken(
  token: string,
  ip: string | undefined,
): Promise<boolean> {
  if (!token || token.length > TOKEN_MAX_LENGTH) return false;

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Turnstile respondió ${response.status}`);
    const result = siteverifyResponseSchema.parse(await response.json());
    // A bad secret is a configuration problem, not a bot: it must show up in the logs.
    const configErrors = result["error-codes"]?.filter((code) => code.includes("secret"));
    if (configErrors?.length) {
      console.error("Turnstile rechazó la clave secreta:", configErrors.join(", "));
    }
    return result.success;
  } catch (error) {
    console.error("No se pudo validar el token de Turnstile:", error);
    return false;
  }
}
