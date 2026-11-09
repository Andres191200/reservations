import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/** Vitest global setup: brings the test database schema up to date. */
export default async function applyMigrations() {
  const db = drizzle(process.env.DATABASE_URL!);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await db.$client.end();
  }
}
