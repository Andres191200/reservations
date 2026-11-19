import { sql } from "drizzle-orm";
import { db as appDb, type Db } from "@/db";

/** How long the database has to answer before the app counts as not healthy. */
const DATABASE_TIMEOUT_MS = 3000;

/**
 * The answer of the health endpoint: 200 `{"status":"ok"}` when the app is up and can
 * query the database, 503 `{"status":"error"}` otherwise. It never says why, nor which
 * versions run: the endpoint is public. The reason stays in the server's log.
 */
export async function healthResponse(db: Pick<Db, "execute"> = appDb): Promise<Response> {
  const healthy = await databaseAnswers(db);
  return Response.json(
    { status: healthy ? "ok" : "error" },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function databaseAnswers(db: Pick<Db, "execute">): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`La base no respondió en ${DATABASE_TIMEOUT_MS} ms`)),
      DATABASE_TIMEOUT_MS,
    );
  });
  try {
    await Promise.race([db.execute(sql`select 1`), timeout]);
    return true;
  } catch (error) {
    // Only the log: a monitor polls this endpoint, and an outage would flood Sentry.
    console.error("Chequeo de salud: la base no responde:", error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
