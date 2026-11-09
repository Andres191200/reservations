import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { registerBusiness } from "@/core/businesses";
import { changeAdminPassword, getAdmin } from "./admins";
import { findBusinessByPath, getBusiness } from "./businesses";
import { db } from "./index";
import { accounts } from "./schema";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// Tests call the same functions the app uses and check what is observable.

async function register(name: string, path: string) {
  const result = await registerBusiness({ name, path, adminEmail: `admin@${path}.com` });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("Businesses", () => {
  it("a registered Business is found by its path", async () => {
    await register("Barbería Don Pepe", "don-pepe");

    const business = await findBusinessByPath("don-pepe");

    expect(business).toMatchObject({ name: "Barbería Don Pepe", path: "don-pepe" });
  });
});

describe("Isolation between Businesses", () => {
  it("with one Business's id only its own data is read, never the other's", async () => {
    const { business: a } = await register("Negocio A", "negocio-a");
    const { business: b } = await register("Negocio B", "negocio-b");

    expect(await getBusiness(a.id)).toMatchObject({ id: a.id, name: "Negocio A" });
    expect(await getBusiness(b.id)).toMatchObject({ id: b.id, name: "Negocio B" });
    expect(await getAdmin(a.id)).toMatchObject({ businessId: a.id, email: "admin@negocio-a.com" });
    expect(await getAdmin(b.id)).toMatchObject({ businessId: b.id, email: "admin@negocio-b.com" });
  });

  it("changing the password with one Business's id does not touch the other's", async () => {
    const { business: a } = await register("Negocio A", "negocio-a");
    const { business: b, password: passwordOfB } = await register("Negocio B", "negocio-b");
    const adminOfB = (await getAdmin(b.id))!;

    await changeAdminPassword(a.id, "new-hash");

    const [accountOfB] = await db.select().from(accounts).where(eq(accounts.userId, adminOfB.id));
    expect(await verifyPassword({ hash: accountOfB.password!, password: passwordOfB })).toBe(true);
  });
});
