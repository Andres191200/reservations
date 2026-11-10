import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { changeAdminPassword, findAdminByEmail } from "@/db/admins";
import { createBusinessWithAdmin, findBusinessByPath, type Business } from "@/db/businesses";
import { validatePath } from "./path";
import type { Result } from "./result";

const registrationSchema = z.object({
  name: z.string().trim().min(1, "El nombre del Negocio no puede estar vacío."),
  path: z.string().trim(),
  adminEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("El email del Administrador no es válido.")),
});

export type BusinessRegistration = z.input<typeof registrationSchema>;

/**
 * Registers a Business with its Admin. Used by the operator command.
 * Returns the generated initial password, which is only shown this once.
 */
export async function registerBusiness(
  data: BusinessRegistration,
): Promise<Result<{ business: Business; password: string }>> {
  const parsed = registrationSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }
  const { name, path, adminEmail } = parsed.data;

  const validation = validatePath(path);
  if (!validation.valid) return { ok: false, error: validation.reason };

  if (await findBusinessByPath(path)) {
    return { ok: false, error: `El path "${path}" ya lo usa otro Negocio.` };
  }
  if (await findAdminByEmail(adminEmail)) {
    return { ok: false, error: `El email ${adminEmail} ya es Administrador de otro Negocio.` };
  }

  const password = generatePassword();
  try {
    const business = await createBusinessWithAdmin({
      name,
      path,
      adminEmail,
      passwordHash: await hashPassword(password),
    });
    return { ok: true, value: { business, password } };
  } catch (error) {
    // A concurrent registration may have won the race between the check and the insert.
    if (isUniqueViolation(error)) {
      return { ok: false, error: "El path o el email ya están en uso." };
    }
    throw error;
  }
}

/**
 * Generates a new password for the Admin with that email and closes their sessions.
 * Returns the new password, which is only shown this once.
 */
export async function resetAdminPassword(email: string): Promise<Result<{ password: string }>> {
  const admin = await findAdminByEmail(email.trim().toLowerCase());
  if (!admin) {
    return { ok: false, error: `No hay ningún Administrador con el email ${email}.` };
  }

  const password = generatePassword();
  await changeAdminPassword(admin.businessId, await hashPassword(password));
  return { ok: true, value: { password } };
}

/** 18 random bytes in base64url: 24 characters, easy to copy and paste. */
function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps the `pg` error in `cause`.
  for (let current = error; current instanceof Error; current = current.cause) {
    if ((current as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
