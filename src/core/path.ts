/**
 * Paths a Business cannot use because they clash with platform routes
 * (app.com/admin, app.com/api, ...). Add any new top-level route here.
 */
export const RESERVED_PATHS: readonly string[] = ["admin", "api", "reserva", "reservas"];

const MAX_LENGTH = 63;

/** Lowercase letters and digits, separated by single hyphens: `don-pepe`, `barberia-2`. */
const FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type PathValidation = { valid: true } | { valid: false; reason: string };

/**
 * Validates the format of a Business's public page path (app.com/<path>).
 * Does not query the database: whether the path is taken is checked at registration.
 * `reason` is shown to the operator, so it is in Spanish.
 */
export function validatePath(path: string): PathValidation {
  if (path.length === 0) {
    return { valid: false, reason: "El path no puede estar vacío." };
  }
  if (path.length > MAX_LENGTH) {
    return { valid: false, reason: `El path no puede tener más de ${MAX_LENGTH} caracteres.` };
  }
  if (!FORMAT.test(path)) {
    return {
      valid: false,
      reason:
        "El path solo puede tener minúsculas, números y guiones, sin guiones al principio, al final ni seguidos.",
    };
  }
  if (RESERVED_PATHS.includes(path)) {
    return { valid: false, reason: `"${path}" es una palabra reservada de la plataforma.` };
  }
  return { valid: true };
}
