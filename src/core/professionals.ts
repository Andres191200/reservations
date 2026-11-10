import { z } from "zod";
import * as data from "@/db/professionals";
import type { Professional } from "@/db/professionals";
import type { BusinessId, ProfessionalId } from "@/db/schema";
import type { Result } from "./result";

export type { Professional };

const NAME_MAX_LENGTH = 100;

const newProfessionalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del Profesional no puede estar vacío.")
    .max(NAME_MAX_LENGTH, `El nombre del Profesional puede tener hasta ${NAME_MAX_LENGTH} letras.`),
});

export type NewProfessional = z.input<typeof newProfessionalSchema>;

/** The active Professionals of the Business, by name. */
export function getActiveProfessionals(businessId: BusinessId): Promise<Professional[]> {
  return data.listActiveProfessionals(businessId);
}

/**
 * Adds a Professional to the Business. Since the Admin tells Professionals apart by their
 * name, two active Professionals cannot share it.
 */
export async function addProfessional(
  businessId: BusinessId,
  input: NewProfessional,
): Promise<Result<Professional>> {
  const parsed = newProfessionalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("\n") };
  }
  const { name } = parsed.data;

  const active = await data.listActiveProfessionals(businessId);
  if (active.some((professional) => sameName(professional.name, name))) {
    return { ok: false, error: `Ya hay un Profesional activo llamado ${name}.` };
  }

  return { ok: true, value: await data.insertProfessional(businessId, name) };
}

/**
 * Deactivation: the Professional stops receiving Reservations, but is kept to preserve
 * the history of Reservations it served. `professionalId` comes from the panel, so it is
 * checked: it only works on an active Professional of this Business.
 */
export async function deactivateProfessional(
  businessId: BusinessId,
  professionalId: string,
): Promise<Result<void>> {
  const notFound = { ok: false, error: "Ese Profesional no existe o ya está dado de baja." } as const;

  if (!z.uuid().safeParse(professionalId).success) return notFound;
  const deactivated = await data.deactivateProfessional(
    businessId,
    professionalId as ProfessionalId,
  );
  return deactivated ? { ok: true, value: undefined } : notFound;
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
}
