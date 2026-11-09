import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeEach } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Every table in the schema, so a new table gets cleaned without touching this file.
const tables = Object.values(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => `"${getTableName(table)}"`);

beforeEach(async () => {
  if (tables.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
});

afterAll(async () => {
  await db.$client.end();
});
