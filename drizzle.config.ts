import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Loads `.env*` the same way Next.js does (with NODE_ENV=test it uses `.env.test`).
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL: copiá .env.example a .env.local");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  casing: "snake_case",
  strict: true,
});
