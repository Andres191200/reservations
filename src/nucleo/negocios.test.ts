import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { buscarNegocioPorPath } from "@/db/negocios";
import { administradores, cuentas, sesiones } from "@/db/schema";
import { darDeAltaNegocio, resetearContrasenaDelAdministrador } from "./negocios";

const donPepe = { nombre: "Barbería Don Pepe", path: "don-pepe", emailAdministrador: "admin@donpepe.com" };

async function altaOk(datos = donPepe) {
  const resultado = await darDeAltaNegocio(datos);
  if (!resultado.ok) throw new Error(resultado.error);
  return resultado.valor;
}

/** Hash guardado de la contraseña del Administrador con ese email. */
async function hashGuardado(email: string) {
  const [fila] = await db
    .select({ password: cuentas.password })
    .from(cuentas)
    .innerJoin(administradores, eq(cuentas.userId, administradores.id))
    .where(eq(administradores.email, email));
  return fila.password!;
}

describe("Alta de Negocio", () => {
  it("crea el Negocio con su Administrador y una contraseña inicial que sirve para ingresar", async () => {
    const { negocio, contrasena } = await altaOk();

    expect(await buscarNegocioPorPath("don-pepe")).toMatchObject({
      id: negocio.id,
      nombre: "Barbería Don Pepe",
    });
    expect(await verifyPassword({ hash: await hashGuardado(donPepe.emailAdministrador), password: contrasena })).toBe(true);
  });

  it("guarda el email del Administrador en minúsculas", async () => {
    await altaOk({ ...donPepe, emailAdministrador: "  Admin@DonPepe.com " });

    const [administrador] = await db.select().from(administradores);
    expect(administrador.email).toBe("admin@donpepe.com");
  });

  it.each([
    ["con caracteres inválidos", "Don Pepe"],
    ["reservado", "admin"],
    ["reservado", "api"],
    ["reservado", "reserva"],
  ])("rechaza un path %s (%s)", async (_caso, path) => {
    const resultado = await darDeAltaNegocio({ ...donPepe, path });

    expect(resultado.ok).toBe(false);
    expect(await buscarNegocioPorPath(path)).toBeUndefined();
  });

  it("rechaza un path ya usado por otro Negocio", async () => {
    await altaOk();

    const resultado = await darDeAltaNegocio({ ...donPepe, emailAdministrador: "otro@otro.com" });

    expect(resultado).toEqual({ ok: false, error: expect.stringContaining("ya lo usa otro Negocio") });
  });

  it("rechaza un email que ya es Administrador de otro Negocio, sin dejar el Negocio a medias", async () => {
    await altaOk();

    const resultado = await darDeAltaNegocio({ ...donPepe, path: "otro" });

    expect(resultado.ok).toBe(false);
    expect(await buscarNegocioPorPath("otro")).toBeUndefined();
  });

  it("rechaza un nombre vacío o un email inválido", async () => {
    expect((await darDeAltaNegocio({ ...donPepe, nombre: "  " })).ok).toBe(false);
    expect((await darDeAltaNegocio({ ...donPepe, emailAdministrador: "no-es-email" })).ok).toBe(false);
    expect(await buscarNegocioPorPath("don-pepe")).toBeUndefined();
  });
});

describe("Reseteo de contraseña del Administrador", () => {
  it("genera una contraseña nueva, invalida la anterior y cierra las sesiones abiertas", async () => {
    const { contrasena: anterior } = await altaOk();
    const [administrador] = await db.select().from(administradores);
    await db.insert(sesiones).values({
      userId: administrador.id,
      token: "token-de-una-sesion-abierta",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const resultado = await resetearContrasenaDelAdministrador("ADMIN@donpepe.com");
    if (!resultado.ok) throw new Error(resultado.error);

    const hash = await hashGuardado(donPepe.emailAdministrador);
    expect(await verifyPassword({ hash, password: resultado.valor.contrasena })).toBe(true);
    expect(await verifyPassword({ hash, password: anterior })).toBe(false);
    expect(await db.select().from(sesiones)).toEqual([]);
  });

  it("informa si no hay Administrador con ese email", async () => {
    expect(await resetearContrasenaDelAdministrador("nadie@nada.com")).toMatchObject({ ok: false });
  });
});
