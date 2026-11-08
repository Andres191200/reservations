import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { obtenerNegocio, type Negocio } from "@/db/negocios";
import type { NegocioId } from "@/db/schema";
import { auth } from "@/lib/auth";

export const RUTA_LOGIN = "/admin/login";

/**
 * El Negocio del Administrador con sesión iniciada. Es la única forma de saber de qué
 * Negocio es el panel: nunca se toma de la URL ni de un formulario.
 * Sin sesión válida, redirige al login. Llamarlo en cada página y server action del panel.
 */
export const obtenerNegocioDeLaSesion = cache(async (): Promise<Negocio> => {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion) redirect(RUTA_LOGIN);

  const negocio = await obtenerNegocio(sesion.user.negocioId as NegocioId);
  if (!negocio) redirect(RUTA_LOGIN);
  return negocio;
});
