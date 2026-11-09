import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { findBusinessByPath } from "@/db/businesses";
import { accounts, admins, sessions } from "@/db/schema";
import { registerBusiness, resetAdminPassword } from "./businesses";

const donPepe = { name: "Barbería Don Pepe", path: "don-pepe", adminEmail: "admin@donpepe.com" };

async function register(data = donPepe) {
  const result = await registerBusiness(data);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

/** Stored password hash of the Admin with that email. */
async function storedHash(email: string) {
  const [row] = await db
    .select({ password: accounts.password })
    .from(accounts)
    .innerJoin(admins, eq(accounts.userId, admins.id))
    .where(eq(admins.email, email));
  return row.password!;
}

describe("Business registration", () => {
  it("creates the Business with its Admin and an initial password that works for signing in", async () => {
    const { business, password } = await register();

    expect(await findBusinessByPath("don-pepe")).toMatchObject({
      id: business.id,
      name: "Barbería Don Pepe",
    });
    expect(await verifyPassword({ hash: await storedHash(donPepe.adminEmail), password })).toBe(true);
  });

  it("stores the Admin email in lowercase", async () => {
    await register({ ...donPepe, adminEmail: "  Admin@DonPepe.com " });

    const [admin] = await db.select().from(admins);
    expect(admin.email).toBe("admin@donpepe.com");
  });

  it.each([
    ["with invalid characters", "Don Pepe"],
    ["that is reserved", "admin"],
    ["that is reserved", "api"],
    ["that is reserved", "reserva"],
  ])("rejects a path %s (%s)", async (_case, path) => {
    const result = await registerBusiness({ ...donPepe, path });

    expect(result.ok).toBe(false);
    expect(await findBusinessByPath(path)).toBeUndefined();
  });

  it("rejects a path already used by another Business", async () => {
    await register();

    const result = await registerBusiness({ ...donPepe, adminEmail: "otro@otro.com" });

    expect(result).toEqual({ ok: false, error: expect.stringContaining("ya lo usa otro Negocio") });
  });

  it("rejects an email that is already another Business's Admin, without leaving a half-created Business", async () => {
    await register();

    const result = await registerBusiness({ ...donPepe, path: "otro" });

    expect(result.ok).toBe(false);
    expect(await findBusinessByPath("otro")).toBeUndefined();
  });

  it("rejects an empty name or an invalid email", async () => {
    expect((await registerBusiness({ ...donPepe, name: "  " })).ok).toBe(false);
    expect((await registerBusiness({ ...donPepe, adminEmail: "no-es-email" })).ok).toBe(false);
    expect(await findBusinessByPath("don-pepe")).toBeUndefined();
  });
});

describe("Admin password reset", () => {
  it("generates a new password, invalidates the old one and closes open sessions", async () => {
    const { password: oldPassword } = await register();
    const [admin] = await db.select().from(admins);
    await db.insert(sessions).values({
      userId: admin.id,
      token: "token-of-an-open-session",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await resetAdminPassword("ADMIN@donpepe.com");
    if (!result.ok) throw new Error(result.error);

    const hash = await storedHash(donPepe.adminEmail);
    expect(await verifyPassword({ hash, password: result.value.password })).toBe(true);
    expect(await verifyPassword({ hash, password: oldPassword })).toBe(false);
    expect(await db.select().from(sessions)).toEqual([]);
  });

  it("reports when no Admin has that email", async () => {
    expect(await resetAdminPassword("nadie@nada.com")).toMatchObject({ ok: false });
  });
});
