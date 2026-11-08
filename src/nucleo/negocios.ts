import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { buscarAdministradorPorEmail, cambiarContrasenaDelAdministrador } from "@/db/administradores";
import { buscarNegocioPorPath, crearNegocioConAdministrador, type Negocio } from "@/db/negocios";
import { validarPath } from "./path";

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

const datosAltaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre del Negocio no puede estar vacío."),
  path: z.string().trim(),
  emailAdministrador: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("El email del Administrador no es válido.")),
});

export type DatosAltaNegocio = z.input<typeof datosAltaSchema>;

/**
 * Da de alta un Negocio con su Administrador. Lo usa el comando del operador.
 * Devuelve la contraseña inicial generada, que solo se muestra esta vez.
 */
export async function darDeAltaNegocio(
  datos: DatosAltaNegocio,
): Promise<Resultado<{ negocio: Negocio; contrasena: string }>> {
  const parseo = datosAltaSchema.safeParse(datos);
  if (!parseo.success) {
    return { ok: false, error: parseo.error.issues.map((issue) => issue.message).join(" ") };
  }
  const { nombre, path, emailAdministrador } = parseo.data;

  const validacion = validarPath(path);
  if (!validacion.valido) return { ok: false, error: validacion.motivo };

  if (await buscarNegocioPorPath(path)) {
    return { ok: false, error: `El path "${path}" ya lo usa otro Negocio.` };
  }
  if (await buscarAdministradorPorEmail(emailAdministrador)) {
    return { ok: false, error: `El email ${emailAdministrador} ya es Administrador de otro Negocio.` };
  }

  const contrasena = generarContrasena();
  try {
    const negocio = await crearNegocioConAdministrador({
      nombre,
      path,
      emailAdministrador,
      hashContrasena: await hashPassword(contrasena),
    });
    return { ok: true, valor: { negocio, contrasena } };
  } catch (error) {
    // Otro alta simultáneo pudo ganar la carrera entre la verificación y el insert.
    if (esViolacionDeUnicidad(error)) {
      return { ok: false, error: "El path o el email ya están en uso." };
    }
    throw error;
  }
}

/**
 * Genera una contraseña nueva para el Administrador con ese email y cierra sus sesiones.
 * Devuelve la contraseña nueva, que solo se muestra esta vez.
 */
export async function resetearContrasenaDelAdministrador(
  email: string,
): Promise<Resultado<{ contrasena: string }>> {
  const administrador = await buscarAdministradorPorEmail(email.trim().toLowerCase());
  if (!administrador) {
    return { ok: false, error: `No hay ningún Administrador con el email ${email}.` };
  }

  const contrasena = generarContrasena();
  await cambiarContrasenaDelAdministrador(administrador.negocioId, await hashPassword(contrasena));
  return { ok: true, valor: { contrasena } };
}

/** 18 bytes aleatorios en base64url: 24 caracteres, fácil de copiar y pegar. */
function generarContrasena(): string {
  return randomBytes(18).toString("base64url");
}

function esViolacionDeUnicidad(error: unknown): boolean {
  // Drizzle envuelve el error de `pg` en `cause`.
  for (let actual = error; actual instanceof Error; actual = actual.cause) {
    if ((actual as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
