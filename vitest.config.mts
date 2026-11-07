import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Vitest corre con NODE_ENV=test, así que esto carga `.env.test` (y nunca `.env.local`).
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Aplica las migraciones a la base de tests una vez antes de correr.
    globalSetup: ["./src/test/aplicar-migraciones.ts"],
    // Vacía la base antes de cada test.
    setupFiles: ["./src/test/base-limpia.ts"],
    // Todos los archivos comparten la misma base: correrlos de a uno evita que
    // un archivo vacíe la base mientras otro la está usando.
    fileParallelism: false,
  },
});
