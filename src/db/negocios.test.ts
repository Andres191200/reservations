import { describe, expect, it } from "vitest";
import { darDeAltaNegocio } from "@/nucleo/negocios";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { cambiarContrasenaDelAdministrador, obtenerAdministrador } from "./administradores";
import { buscarNegocioPorPath, obtenerNegocio } from "./negocios";
import { cuentas } from "./schema";

// Corre contra el Postgres real (base `reservas_test`), que se vacía antes de cada test.
// Los tests llaman a las mismas funciones que usa la app y verifican lo observable.

async function alta(nombre: string, path: string) {
  const resultado = await darDeAltaNegocio({ nombre, path, emailAdministrador: `admin@${path}.com` });
  if (!resultado.ok) throw new Error(resultado.error);
  return resultado.valor;
}

describe("Negocios", () => {
  it("un Negocio dado de alta se encuentra por su path", async () => {
    await alta("Barbería Don Pepe", "don-pepe");

    const negocio = await buscarNegocioPorPath("don-pepe");

    expect(negocio).toMatchObject({ nombre: "Barbería Don Pepe", path: "don-pepe" });
  });
});

describe("Aislamiento entre Negocios", () => {
  it("con el negocioId de uno solo se leen sus datos, nunca los del otro", async () => {
    const { negocio: a } = await alta("Negocio A", "negocio-a");
    const { negocio: b } = await alta("Negocio B", "negocio-b");

    expect(await obtenerNegocio(a.id)).toMatchObject({ id: a.id, nombre: "Negocio A" });
    expect(await obtenerNegocio(b.id)).toMatchObject({ id: b.id, nombre: "Negocio B" });
    expect(await obtenerAdministrador(a.id)).toMatchObject({ negocioId: a.id, email: "admin@negocio-a.com" });
    expect(await obtenerAdministrador(b.id)).toMatchObject({ negocioId: b.id, email: "admin@negocio-b.com" });
  });

  it("cambiar la contraseña con el negocioId de uno no toca la del otro", async () => {
    const { negocio: a } = await alta("Negocio A", "negocio-a");
    const { negocio: b, contrasena: contrasenaDeB } = await alta("Negocio B", "negocio-b");
    const administradorB = (await obtenerAdministrador(b.id))!;

    await cambiarContrasenaDelAdministrador(a.id, "hash-nuevo");

    const [cuentaB] = await db.select().from(cuentas).where(eq(cuentas.userId, administradorB.id));
    expect(await verifyPassword({ hash: cuentaB.password!, password: contrasenaDeB })).toBe(true);
  });
});
