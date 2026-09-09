import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "#db/schema.js";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";

// The pool is created lazily on first import. Tests that don't call getDb()
// will never open a real connection, keeping the test suite infrastructure-free.
let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: env.DATABASE_URL });

    _pool.on("connect", () => {
      logger.debug("PostgreSQL connection established");
    });

    _pool.on("error", (err) => {
      logger.error("Unexpected error on idle database client", { err });
    });
  }
  return _pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

/** Call once during graceful shutdown. */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    logger.info("Database pool closed");
  }
}
