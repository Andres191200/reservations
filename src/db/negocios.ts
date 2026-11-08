import { eq } from "drizzle-orm";
import { db } from "./index";
import { administradores, cuentas, negocios, type NegocioId } from "./schema";

export type Negocio = typeof negocios.$inferSelect;

/**
 * Crea el Negocio junto con su Administrador y la credencial de este, todo o nada.
 * `hashContrasena` ya viene hasheada: esta capa nunca ve la contraseña en claro.
 */
export async function crearNegocioConAdministrador(datos: {
  nombre: string;
  path: string;
  emailAdministrador: string;
  hashContrasena: string;
}): Promise<Negocio> {
  return db.transaction(async (tx) => {
    const [negocio] = await tx
      .insert(negocios)
      .values({ nombre: datos.nombre, path: datos.path })
      .returning();
    const [administrador] = await tx
      .insert(administradores)
      .values({ negocioId: negocio.id, name: datos.nombre, email: datos.emailAdministrador })
      .returning();
    // Mismo formato que usa Better Auth al registrar con email y contraseña.
    await tx.insert(cuentas).values({
      userId: administrador.id,
      accountId: administrador.id,
      providerId: "credential",
      password: datos.hashContrasena,
    });
    return negocio;
  });
}

/** El Negocio con ese id. En el panel, el id sale siempre de la sesión. */
export async function obtenerNegocio(negocioId: NegocioId): Promise<Negocio | undefined> {
  return db.query.negocios.findFirst({ where: eq(negocios.id, negocioId) });
}

/** Resuelve el Negocio de la página pública a partir del path de la URL. */
export async function buscarNegocioPorPath(path: string): Promise<Negocio | undefined> {
  return db.query.negocios.findFirst({ where: eq(negocios.path, path) });
}
