// Central re-export barrel for all Drizzle table definitions.
// When you add a new feature's schema file, export it from here.
// drizzle.config.ts and src/config/db.ts both point at this file.
//
export * from "#features/auth/auth.schema.js";

// Add each feature's schema here as its plan is implemented.
