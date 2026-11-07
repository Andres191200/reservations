import { eq } from "drizzle-orm";
import { db } from "./index";
import { negocios } from "./schema";

export type Negocio = typeof negocios.$inferSelect;

export async function crearNegocio(datos: { nombre: string; path: string }): Promise<Negocio> {
  const [negocio] = await db.insert(negocios).values(datos).returning();
  return negocio;
}

export async function buscarNegocioPorPath(path: string): Promise<Negocio | undefined> {
  return db.query.negocios.findFirst({ where: eq(negocios.path, path) });
}
