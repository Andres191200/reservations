import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { administradores, cuentas, sesiones, verificaciones } from "@/db/schema";
import { env } from "./env";

/**
 * Better Auth: login del Administrador con email y contraseña.
 * Las sesiones se guardan en la tabla `sesiones` y el navegador solo recibe una
 * cookie httpOnly con el token (no JWT).
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { administradores, sesiones, cuentas, verificaciones },
  }),
  user: {
    modelName: "administradores",
    additionalFields: {
      // `input: false`: nadie puede elegir su Negocio desde una request.
      negocioId: { type: "string", required: true, input: false },
    },
  },
  session: {
    modelName: "sesiones",
    // La sesión dura 30 días y se renueva sola con el uso: se cierra al hacer logout.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "cuentas" },
  verification: { modelName: "verificaciones" },
  emailAndPassword: {
    enabled: true,
    // Los Administradores los crea el operador con `npm run negocio:alta`.
    disableSignUp: true,
  },
  advanced: {
    database: { generateId: "uuid" },
  },
  // Permite que las server actions que llaman a `auth.api` guarden la cookie de sesión.
  plugins: [nextCookies()],
});
