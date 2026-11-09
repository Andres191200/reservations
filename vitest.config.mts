import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Vitest runs with NODE_ENV=test, so this loads `.env.test` (and never `.env.local`).
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Applies the migrations to the test database once before running.
    globalSetup: ["./src/test/apply-migrations.ts"],
    // Empties the database before each test.
    setupFiles: ["./src/test/clean-database.ts"],
    // All files share the same database: running them one at a time keeps one file
    // from emptying the database while another is using it.
    fileParallelism: false,
  },
});
