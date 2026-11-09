import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { accounts, admins, sessions, type BusinessId } from "./schema";

export type Admin = Pick<typeof admins.$inferSelect, "id" | "businessId" | "email" | "name">;

const columns = {
  id: admins.id,
  businessId: admins.businessId,
  email: admins.email,
  name: admins.name,
};

/**
 * Finds an Admin by email, regardless of their Business.
 * Only for the operator commands; the panel uses `getAdmin`.
 */
export async function findAdminByEmail(email: string): Promise<Admin | undefined> {
  const [admin] = await db.select(columns).from(admins).where(eq(admins.email, email));
  return admin;
}

/** The Admin of the Business. */
export async function getAdmin(businessId: BusinessId): Promise<Admin | undefined> {
  const [admin] = await db.select(columns).from(admins).where(eq(admins.businessId, businessId));
  return admin;
}

/**
 * Replaces the password of the Business's Admin and closes all their sessions,
 * so whoever had the old password is locked out.
 * Returns `false` if the Business has no Admin.
 */
export async function changeAdminPassword(
  businessId: BusinessId,
  passwordHash: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [admin] = await tx
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.businessId, businessId));
    if (!admin) return false;

    await tx
      .update(accounts)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(and(eq(accounts.userId, admin.id), eq(accounts.providerId, "credential")));
    await tx.delete(sessions).where(eq(sessions.userId, admin.id));
    return true;
  });
}
