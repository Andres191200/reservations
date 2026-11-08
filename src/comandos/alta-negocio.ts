// Uso: npm run negocio:alta -- --nombre "Barbería Don Pepe" --path don-pepe --email admin@donpepe.com
import "./cargar-entorno";
import { parseArgs } from "node:util";
import { db } from "@/db";
import { darDeAltaNegocio } from "@/nucleo/negocios";

const USO =
  'Uso: npm run negocio:alta -- --nombre "Barbería Don Pepe" --path don-pepe --email admin@donpepe.com';

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      nombre: { type: "string" },
      path: { type: "string" },
      email: { type: "string" },
    },
  });
  if (!values.nombre || !values.path || !values.email) {
    console.error(`Faltan datos.\n${USO}`);
    return 1;
  }

  const resultado = await darDeAltaNegocio({
    nombre: values.nombre,
    path: values.path,
    emailAdministrador: values.email,
  });
  if (!resultado.ok) {
    console.error(`❌ No se creó el Negocio: ${resultado.error}`);
    return 1;
  }

  const { negocio, contrasena } = resultado.valor;
  console.log(`✅ Negocio "${negocio.nombre}" creado.`);
  console.log(`   Página pública: /${negocio.path}`);
  console.log(`   Panel: /admin`);
  console.log(`   Email del Administrador: ${values.email.trim().toLowerCase()}`);
  console.log(`   Contraseña inicial: ${contrasena}`);
  console.log("   Guardala ahora: no se vuelve a mostrar. Para cambiarla: npm run administrador:resetear-contrasena");
  return 0;
}

main()
  .then((codigo) => (process.exitCode = codigo))
  .finally(() => db.$client.end());
