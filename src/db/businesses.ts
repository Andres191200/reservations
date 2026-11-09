import { eq } from "drizzle-orm";
import { db } from "./index";
import { accounts, admins, businesses, type BusinessId } from "./schema";

export type Business = typeof businesses.$inferSelect;

/**
 * Creates the Business together with its Admin and the Admin's credential, all or nothing.
 * `passwordHash` arrives already hashed: this layer never sees the plain password.
 */
export async function createBusinessWithAdmin(data: {
  name: string;
  path: string;
  adminEmail: string;
  passwordHash: string;
}): Promise<Business> {
  return db.transaction(async (tx) => {
    const [business] = await tx
      .insert(businesses)
      .values({ name: data.name, path: data.path })
      .returning();
    const [admin] = await tx
      .insert(admins)
      .values({ businessId: business.id, name: data.name, email: data.adminEmail })
      .returning();
    // Same shape Better Auth uses when signing up with email and password.
    await tx.insert(accounts).values({
      userId: admin.id,
      accountId: admin.id,
      providerId: "credential",
      password: data.passwordHash,
    });
    return business;
  });
}

/** The Business with that id. In the panel, the id always comes from the session. */
export async function getBusiness(businessId: BusinessId): Promise<Business | undefined> {
  return db.query.businesses.findFirst({ where: eq(businesses.id, businessId) });
}

/** Resolves the Business of the public page from the URL path. */
export async function findBusinessByPath(path: string): Promise<Business | undefined> {
  return db.query.businesses.findFirst({ where: eq(businesses.path, path) });
}
