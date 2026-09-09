import { createApp } from "./app.js";
import { env } from "#config/env.js";
import { closeDb } from "#config/db.js";
import logger from "#shared/utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`, { port: env.PORT, env: env.NODE_ENV });
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(() => {
    void closeDb().then(() => {
      logger.info("Shutdown complete");
      process.exit(0);
    });
  });

  // Force-kill if shutdown takes longer than 10s.
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  shutdown("SIGINT");
});
