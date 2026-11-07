import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/** Global setup de Vitest: deja la base de tests con el esquema al día. */
export default async function aplicarMigraciones() {
  const db = drizzle(process.env.DATABASE_URL!);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await db.$client.end();
  }
}
