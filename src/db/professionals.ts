import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { professionals, type BusinessId, type ProfessionalId } from "./schema";

/** An active Professional, as the panel shows it. */
export type Professional = { id: ProfessionalId; name: string };

const professionalColumns = { id: professionals.id, name: professionals.name };

export async function insertProfessional(
  businessId: BusinessId,
  name: string,
): Promise<Professional> {
  const [professional] = await db
    .insert(professionals)
    .values({ businessId, name })
    .returning(professionalColumns);
  return professional;
}

/** The active Professionals of the Business, by name. Deactivated ones are left out. */
export async function listActiveProfessionals(businessId: BusinessId): Promise<Professional[]> {
  return db
    .select(professionalColumns)
    .from(professionals)
    .where(and(eq(professionals.businessId, businessId), isNull(professionals.deactivatedAt)))
    .orderBy(asc(professionals.name), asc(professionals.createdAt));
}

/**
 * Deactivates the Professional if it is active and belongs to the Business.
 * Returns whether it did: false for an unknown id, another Business's Professional or
 * one already deactivated.
 */
export async function deactivateProfessional(
  businessId: BusinessId,
  professionalId: ProfessionalId,
): Promise<boolean> {
  const updated = await db
    .update(professionals)
    .set({ deactivatedAt: new Date() })
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.businessId, businessId),
        isNull(professionals.deactivatedAt),
      ),
    )
    .returning({ id: professionals.id });
  return updated.length > 0;
}
