// Usage: npm run db:migrate:app  (in the production image: node commands/migrate.cjs)
// Applies the pending migrations of drizzle/ to the database of DATABASE_URL. It does the
// same as `npm run db:migrate`, but without drizzle-kit, which is not in the production
// image. Output is in Spanish: it is read by the operator.
import "./load-env";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";

/** Where the migrations are: drizzle/ next to where the command runs. */
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

async function main(): Promise<number> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("✅ Migraciones aplicadas.");
  return 0;
}

main()
  .then((code) => (process.exitCode = code))
  .catch((error) => {
    console.error("❌ No se pudieron aplicar las migraciones:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
