import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/** Conexión única a Postgres, compartida por toda la app. */
export const db = drizzle(env.DATABASE_URL, { schema, casing: "snake_case" });

export type Db = typeof db;
