import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index";
import { Pool } from "pg";
import dotenv from "dotenv";
import logger from "../utils/logger"

dotenv.config()

if (!process.env.DATABASE_URL) {
    throw new Error ("DATABASE_URL not found");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
    logger.info("Database connected successfully");
})

pool.on("error", (err) => {
    logger.error("Unexpected error on idle database client", err);
    process.exit(-1)
})

export const db = drizzle(pool, { schema })
