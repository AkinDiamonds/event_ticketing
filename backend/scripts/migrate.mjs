/**
 * Run pending Drizzle migrations against DATABASE_URL using the
 * programmatic migrator (drizzle-orm/node-postgres/migrator).
 *
 * This uses only drizzle-orm (a production dependency), NOT drizzle-kit
 * (which is a devDependency and absent on Render's production install).
 *
 * Called by the "start" script so every deploy automatically applies
 * pending migrations before the HTTP server boots.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set. Cannot run migrations.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

const migrationsFolder = resolve(__dirname, "../drizzle");

console.log("[migrate] Applying pending migrations from", migrationsFolder);

try {
  await migrate(db, { migrationsFolder });
  console.log("[migrate] Migrations applied successfully.");
} catch (err) {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
