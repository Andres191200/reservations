import { z } from "zod";

/**
 * Validación de variables de entorno con Zod.
 * Se importa en next.config.ts para fallar rápido en dev/build.
 * Las variables públicas deben empezar por NEXT_PUBLIC_.
 * Contiene variables de servidor: no importar desde componentes de cliente.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Reservas"),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "Debe ser una URL de Postgres (postgres://usuario:clave@host:puerto/base)",
  }),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
});

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:", z.treeifyError(parsed.error));
  throw new Error("Variables de entorno inválidas");
}

export const env = parsed.data;
