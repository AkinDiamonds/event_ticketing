import { createApp } from "./app.js";
import { env } from "#config/env.js";
import { closeDb } from "#config/db.js";
import logger from "#shared/utils/logger.js";
import {
  createEmailSender,
  MetaCloudWhatsAppSender,
  setEmailSender as setNotificationsEmailSender,
  setWhatsAppSender as setNotificationsWhatsAppSender,
} from "#features/notifications/index.js";
import { setEmailSender as setAuthEmailSender } from "#features/auth/index.js";
import { cleanupExpiredReservations } from "#features/orders/index.js";

if (env.NODE_ENV !== "test") {
  const emailSender = createEmailSender();
  setNotificationsEmailSender(emailSender);
  setAuthEmailSender(emailSender);

  if (env.WHATSAPP_ENABLED) {
    setNotificationsWhatsAppSender(new MetaCloudWhatsAppSender());
  }
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`, { port: env.PORT, env: env.NODE_ENV });
});

let cleanupTask: Promise<void> | undefined;
function runReservationCleanup(): void {
  if (cleanupTask) return;
  cleanupTask = cleanupExpiredReservations()
    .then(() => undefined)
    .catch((error: unknown) => { logger.error("Reservation cleanup failed", { error }); })
    .finally(() => { cleanupTask = undefined; });
}

const cleanupTimer = setInterval(runReservationCleanup, 60_000).unref();
runReservationCleanup();

// ── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);
  clearInterval(cleanupTimer);

  server.close(() => {
    void Promise.resolve(cleanupTask).then(closeDb).then(() => {
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
