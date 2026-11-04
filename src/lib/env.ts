import { z } from "zod";

/**
 * Validación de variables de entorno con Zod.
 * Se importa en next.config.ts para fallar rápido en dev/build.
 * Las variables públicas deben empezar por NEXT_PUBLIC_.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Next Boilerplate"),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:", z.treeifyError(parsed.error));
  throw new Error("Variables de entorno inválidas");
}

export const env = parsed.data;
