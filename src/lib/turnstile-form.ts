/** What the Reservation form and the server share about Turnstile (no secrets here). */

/** Name of the form field with the token, filled by the widget on the page. */
export const TURNSTILE_TOKEN_FIELD = "turnstileToken";

/** Shown when the browser could not be checked: no token, expired, used, or rejected. */
export const TURNSTILE_FAILED_ERROR =
  "No pudimos verificar que no seas un robot. Recargá la página y probá de nuevo.";
