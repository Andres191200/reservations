import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeEach } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Todas las tablas del esquema, así una tabla nueva se limpia sin tocar este archivo.
const tablas = Object.values(schema)
  .filter((valor) => is(valor, PgTable))
  .map((tabla) => `"${getTableName(tabla)}"`);

beforeEach(async () => {
  if (tablas.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE ${tablas.join(", ")} RESTART IDENTITY CASCADE`));
});

afterAll(async () => {
  await db.$client.end();
});
