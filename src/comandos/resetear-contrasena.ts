// Uso: npm run administrador:resetear-contrasena -- --email admin@donpepe.com
import "./cargar-entorno";
import { parseArgs } from "node:util";
import { db } from "@/db";
import { resetearContrasenaDelAdministrador } from "@/nucleo/negocios";

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { email: { type: "string" } } });
  if (!values.email) {
    console.error("Falta el email.\nUso: npm run administrador:resetear-contrasena -- --email admin@donpepe.com");
    return 1;
  }

  const resultado = await resetearContrasenaDelAdministrador(values.email);
  if (!resultado.ok) {
    console.error(`❌ ${resultado.error}`);
    return 1;
  }

  console.log(`✅ Contraseña nueva: ${resultado.valor.contrasena}`);
  console.log("   Se cerraron todas las sesiones abiertas de ese Administrador.");
  return 0;
}

main()
  .then((codigo) => (process.exitCode = codigo))
  .finally(() => db.$client.end());
