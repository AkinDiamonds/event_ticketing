import express, { type Application } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "#config/env.js";
import { createOpenApiDocument } from "#config/openapi.js";
import { errorHandler } from "#shared/middleware/error-handler.js";
import healthRouter from "#features/health/health.router.js";
import authRouter from "#features/auth/auth.routes.js";
import eventsRouter from "#features/events/events.routes.js";
import ordersRouter from "#features/orders/orders.routes.js";
import paymentsRouter from "#features/payments/payments.routes.js";

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

  // Webhook route requires raw body Buffer before express.json() parses body
  app.use("/api/v1/payments", paymentsRouter);

  app.use(express.json());

  // ── Routes ───────────────────────────────────────────────────────────────
  app.use("/api/health", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/events", eventsRouter);
  app.use("/api/v1/orders", ordersRouter);

  if (env.ENABLE_SWAGGER) {
    app.get("/api/docs.json", (_req, res) => {
      res.json(createOpenApiDocument());
    });
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(createOpenApiDocument()));
  }

  // ── Error handling (must be last) ────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
