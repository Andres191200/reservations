import { loadEnvConfig } from "@next/env";

// Loads `.env*` the same way Next.js does. Commands import this first,
// because `src/lib/env.ts` validates the variables as soon as it is imported.
loadEnvConfig(process.cwd());
