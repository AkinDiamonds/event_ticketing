import express, { type Application } from "express";
import cors from "cors";
import { env } from "#config/env.js";
import { errorHandler } from "#shared/middleware/error-handler.js";
import healthRouter from "#features/health/health.router.js";

/**
 * createApp builds and returns the configured Express application.
 *
 * Separating construction from startup (server.ts) means tests can import
 * and exercise the app without binding a real port or requiring Postgres.
 */
export function createApp(): Application {
  const app = express();

  // ── Core middleware ──────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json());

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use("/api/health", healthRouter);

  // TODO (Plan 02): mount auth router   → app.use("/api/v1/auth", authRouter)
  // TODO (Plan 03): mount events router → app.use("/api/v1/events", eventsRouter)
  // TODO (Plan 04): mount orders router → app.use("/api/v1/orders", ordersRouter)
  // TODO (Plan 04): mount payments router → app.use("/api/v1/payments", paymentsRouter)
  // TODO (Plan 05): mount tickets router → app.use("/api/v1/tickets", ticketsRouter)

  // ── Error handling (must be last) ────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
