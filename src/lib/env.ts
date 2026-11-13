import { z } from "zod";

/**
 * Environment variable validation with Zod.
 * Imported from next.config.ts to fail fast in dev/build.
 * Public variables must start with NEXT_PUBLIC_.
 * Holds server variables: do not import from client components.
 * Error messages are in Spanish: they are read by the developer running the app.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Reservas"),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: "Debe ser una URL de Postgres (postgres://usuario:clave@host:puerto/base)",
  }),
  BETTER_AUTH_SECRET: z.string().min(32, {
    error: "Debe tener al menos 32 caracteres. Generalo con: openssl rand -base64 32",
  }),
  BETTER_AUTH_URL: z.url({ error: "Debe ser la URL base de la app (http://localhost:3000)" }),
  /** Where emails go: Mailpit in development, Resend in production. */
  EMAIL_TRANSPORT: z
    .enum(["mailpit", "resend"], { error: 'Debe ser "mailpit" (desarrollo) o "resend" (producción)' })
    .default("mailpit"),
  /** Sender address. With Resend, it must belong to a domain verified there. */
  EMAIL_FROM: z.email({ error: "Debe ser un email (reservas@tudominio.com)" }).optional(),
  RESEND_API_KEY: z.string().startsWith("re_", { error: 'Debe empezar con "re_"' }).optional(),
  MAILPIT_URL: z.url({ error: "Debe ser la URL de Mailpit (http://localhost:8025)" }).default(
    "http://localhost:8025",
  ),
});

/** With Resend, the key and the sender are mandatory; Mailpit accepts any sender. */
const envWithEmailSchema = envSchema
  .superRefine((env, context) => {
    if (env.EMAIL_TRANSPORT !== "resend") return;
    if (!env.RESEND_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: 'Es obligatoria con EMAIL_TRANSPORT="resend". Se genera en el panel de Resend.',
      });
    }
    if (!env.EMAIL_FROM) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: 'Es obligatorio con EMAIL_TRANSPORT="resend", con un dominio verificado en Resend.',
      });
    }
  })
  .transform((env) => ({ ...env, EMAIL_FROM: env.EMAIL_FROM ?? "reservas@localhost.test" }));

const parsed = envWithEmailSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  MAILPIT_URL: process.env.MAILPIT_URL || undefined,
});

if (!parsed.success) {
  console.error(`❌ Variables de entorno inválidas:\n${z.prettifyError(parsed.error)}`);
  throw new Error("Variables de entorno inválidas");
}

export const env = parsed.data;
