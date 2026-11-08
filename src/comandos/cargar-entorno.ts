import { loadEnvConfig } from "@next/env";

// Carga `.env*` igual que Next.js. Los comandos lo importan antes que nada,
// porque `src/lib/env.ts` valida las variables apenas se importa.
loadEnvConfig(process.cwd());
