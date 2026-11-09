import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { accounts, admins, sessions, verifications } from "@/db/schema";
import { env } from "./env";

/**
 * Better Auth: Admin login with email and password.
 * Sessions are stored in the `sessions` table; the browser only gets an httpOnly
 * cookie with the token (no JWT).
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { admins, sessions, accounts, verifications },
  }),
  user: {
    modelName: "admins",
    additionalFields: {
      // `input: false`: nobody can choose their Business from a request.
      businessId: { type: "string", required: true, input: false },
    },
  },
  session: {
    modelName: "sessions",
    // Sessions last 30 days and renew themselves with use: they end on sign-out.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "accounts" },
  verification: { modelName: "verifications" },
  emailAndPassword: {
    enabled: true,
    // Admins are created by the operator with `npm run business:register`.
    disableSignUp: true,
  },
  advanced: {
    database: { generateId: "uuid" },
  },
  // Lets server actions that call `auth.api` set the session cookie.
  plugins: [nextCookies()],
});
