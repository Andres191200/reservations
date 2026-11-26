/** What the Reservation form and the server share about Turnstile (no secrets here). */

/** Name of the form field with the token, filled by the widget on the page. */
export const TURNSTILE_TOKEN_FIELD = "turnstileToken";

/**
 * Shown when the browser could not be checked: no token in time, expired, used, or
 * rejected. Touching the button again asks for a new token. It does not say to reload the
 * page, which would erase what the Customer typed.
 */
export const TURNSTILE_FAILED_ERROR =
  "No pudimos verificar que no seas un robot. Revisá tu conexión y volvé a tocar Confirmar Reserva.";
