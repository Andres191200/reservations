// Usage: npm run business:register -- --name "Barbería Don Pepe" --path don-pepe --email admin@donpepe.com
// Output is in Spanish: it is read by the operator.
import "./load-env";
import { parseArgs } from "node:util";
import { db } from "@/db";
import { registerBusiness } from "@/core/businesses";

const USAGE =
  'Uso: npm run business:register -- --name "Barbería Don Pepe" --path don-pepe --email admin@donpepe.com';

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      path: { type: "string" },
      email: { type: "string" },
    },
  });
  if (!values.name || !values.path || !values.email) {
    console.error(`Faltan datos.\n${USAGE}`);
    return 1;
  }

  const result = await registerBusiness({
    name: values.name,
    path: values.path,
    adminEmail: values.email,
  });
  if (!result.ok) {
    console.error(`❌ No se creó el Negocio: ${result.error}`);
    return 1;
  }

  const { business, password } = result.value;
  console.log(`✅ Negocio "${business.name}" creado.`);
  console.log(`   Página pública: /${business.path}`);
  console.log(`   Panel: /admin`);
  console.log(`   Email del Administrador: ${values.email.trim().toLowerCase()}`);
  console.log(`   Contraseña inicial: ${password}`);
  console.log("   Guardala ahora: no se vuelve a mostrar. Para cambiarla: npm run admin:reset-password");
  return 0;
}

main()
  .then((code) => (process.exitCode = code))
  .finally(() => db.$client.end());
