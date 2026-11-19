import { connection } from "next/server";
import { healthResponse } from "@/lib/health";

/**
 * Health endpoint, public: OK only if the app started and can reach the database. Used by
 * Docker's healthcheck and by uptime monitors.
 */
export async function GET() {
  // Always at request time: never prerendered at build, when there is no database.
  await connection();
  return healthResponse();
}
