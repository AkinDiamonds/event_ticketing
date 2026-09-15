import express, { type Application } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "#config/env.js";
import { createOpenApiDocument } from "#config/openapi.js";
import { errorHandler } from "#shared/middleware/error-handler.js";
import healthRouter from "#features/health/health.router.js";
import authRouter from "#features/auth/auth.routes.js";
import eventsRouter from "#features/events/events.routes.js";

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
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/events", eventsRouter);

  if (env.ENABLE_SWAGGER) {
    app.get("/api/docs.json", (_req, res) => {
      res.json(createOpenApiDocument());
    });
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(createOpenApiDocument()));
  }

  // TODO (Plan 05): mount orders router → app.use("/api/v1/orders", ordersRouter)
  // TODO (Plan 05): mount payments router → app.use("/api/v1/payments", paymentsRouter)
  // TODO (Plan 06): mount tickets router → app.use("/api/v1/tickets", ticketsRouter)

  // ── Error handling (must be last) ────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
