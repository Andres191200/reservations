/**
 * Paths que no puede usar un Negocio porque chocan con rutas de la plataforma
 * (app.com/admin, app.com/api, ...). Agregar acá cualquier ruta nueva de primer nivel.
 */
export const PATHS_RESERVADOS: readonly string[] = ["admin", "api", "reserva", "reservas"];

const LARGO_MAXIMO = 63;

/** Minúsculas y números, separados por guiones simples: `don-pepe`, `barberia-2`. */
const FORMATO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type ResultadoValidacionPath = { valido: true } | { valido: false; motivo: string };

/**
 * Valida el formato del path de la página pública de un Negocio (app.com/<path>).
 * No consulta la base: que el path no esté ya usado se verifica al dar de alta.
 */
export function validarPath(path: string): ResultadoValidacionPath {
  if (path.length === 0) {
    return { valido: false, motivo: "El path no puede estar vacío." };
  }
  if (path.length > LARGO_MAXIMO) {
    return { valido: false, motivo: `El path no puede tener más de ${LARGO_MAXIMO} caracteres.` };
  }
  if (!FORMATO.test(path)) {
    return {
      valido: false,
      motivo:
        "El path solo puede tener minúsculas, números y guiones, sin guiones al principio, al final ni seguidos.",
    };
  }
  if (PATHS_RESERVADOS.includes(path)) {
    return { valido: false, motivo: `"${path}" es una palabra reservada de la plataforma.` };
  }
  return { valido: true };
}
