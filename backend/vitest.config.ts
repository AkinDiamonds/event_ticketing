import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    // Load a .env.test if present; tests that don't need real infra should
    // still satisfy the env schema — see .env.test.example.
    setupFiles: ["./src/tests/setup.ts"],
    // Both auth.test.ts and events.test.ts are database-backed integration
    // tests that share the same Postgres instance and truncate tables in
    // beforeEach. Running them in parallel causes FK violations and data
    // races. Serialising file execution eliminates all cross-file interference.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/tests/**", "src/db/**", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "#config": resolve(__dirname, "src/config"),
      "#features": resolve(__dirname, "src/features"),
      "#shared": resolve(__dirname, "src/shared"),
      "#db": resolve(__dirname, "src/db"),
    },
  },
});
