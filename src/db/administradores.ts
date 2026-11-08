import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { administradores, cuentas, sesiones, type NegocioId } from "./schema";

export type Administrador = Pick<
  typeof administradores.$inferSelect,
  "id" | "negocioId" | "email" | "name"
>;

const columnas = {
  id: administradores.id,
  negocioId: administradores.negocioId,
  email: administradores.email,
  name: administradores.name,
};

/**
 * Busca un Administrador por su email, sin importar de qué Negocio sea.
 * Es solo para los comandos del operador; el panel usa `obtenerAdministrador`.
 */
export async function buscarAdministradorPorEmail(email: string): Promise<Administrador | undefined> {
  const [administrador] = await db
    .select(columnas)
    .from(administradores)
    .where(eq(administradores.email, email));
  return administrador;
}

/** El Administrador del Negocio. */
export async function obtenerAdministrador(negocioId: NegocioId): Promise<Administrador | undefined> {
  const [administrador] = await db
    .select(columnas)
    .from(administradores)
    .where(eq(administradores.negocioId, negocioId));
  return administrador;
}

/**
 * Reemplaza la contraseña del Administrador del Negocio y cierra todas sus sesiones,
 * para que quien tuviera la contraseña vieja quede afuera.
 * Devuelve `false` si el Negocio no tiene Administrador.
 */
export async function cambiarContrasenaDelAdministrador(
  negocioId: NegocioId,
  hashContrasena: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [administrador] = await tx
      .select({ id: administradores.id })
      .from(administradores)
      .where(eq(administradores.negocioId, negocioId));
    if (!administrador) return false;

    await tx
      .update(cuentas)
      .set({ password: hashContrasena, updatedAt: new Date() })
      .where(and(eq(cuentas.userId, administrador.id), eq(cuentas.providerId, "credential")));
    await tx.delete(sesiones).where(eq(sesiones.userId, administrador.id));
    return true;
  });
}
