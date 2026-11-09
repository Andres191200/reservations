// Usage: npm run admin:reset-password -- --email admin@donpepe.com
// Output is in Spanish: it is read by the operator.
import "./load-env";
import { parseArgs } from "node:util";
import { db } from "@/db";
import { resetAdminPassword } from "@/core/businesses";

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { email: { type: "string" } } });
  if (!values.email) {
    console.error("Falta el email.\nUso: npm run admin:reset-password -- --email admin@donpepe.com");
    return 1;
  }

  const result = await resetAdminPassword(values.email);
  if (!result.ok) {
    console.error(`❌ ${result.error}`);
    return 1;
  }

  console.log(`✅ Contraseña nueva: ${result.value.password}`);
  console.log("   Se cerraron todas las sesiones abiertas de ese Administrador.");
  return 0;
}

main()
  .then((code) => (process.exitCode = code))
  .finally(() => db.$client.end());
