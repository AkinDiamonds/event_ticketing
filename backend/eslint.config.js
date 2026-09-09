// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Enforce explicit return types on functions at module boundary.
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      // Disallow floating promises (critical for async route handlers).
      "@typescript-eslint/no-floating-promises": "error",
      // No unnecessary any.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars should be prefixed with _ to be ignored.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Exclude test setup files and config files from strict typing rules.
    files: ["src/tests/**/*.ts", "vitest.config.ts", "drizzle.config.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "drizzle/**"],
  }
);
