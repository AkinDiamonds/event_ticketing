import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "#shared/middleware/authenticate.js";
import { requireOrganizer } from "#shared/middleware/require-organizer.js";
import { validate } from "#shared/middleware/validate.js";
import { env } from "#config/env.js";
import {
  createEventSchema,
  createTierSchema,
  eventIdParamsSchema,
  listEventsQuerySchema,
  tierIdParamsSchema,
  updateEventSchema,
  updateTierSchema,
} from "./events.schemas.js";
import { checkInBodySchema } from "#features/tickets/tickets.schemas.js";
import * as eventsController from "./events.controller.js";
import * as ticketsController from "#features/tickets/tickets.controller.js";

const publicEventsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // Skip rate limiting in the test environment so the integration test suite
  // does not exhaust the per-window request budget and return 429 responses.
  skip: () => env.NODE_ENV === "test",
});

const checkInRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

const router = Router();

router.get(
  "/",
  publicEventsRateLimiter,
  validate({ query: listEventsQuerySchema }),
  eventsController.listEvents
);
router.get(
  "/:eventId",
  publicEventsRateLimiter,
  validate({ params: eventIdParamsSchema }),
  eventsController.getEvent
);

router.post(
  "/",
  authenticate,
  validate({ body: createEventSchema }),
  eventsController.createEvent
);
router.patch(
  "/:eventId",
  authenticate,
  requireOrganizer,
  validate({ params: eventIdParamsSchema, body: updateEventSchema }),
  eventsController.updateEvent
);
router.delete(
  "/:eventId",
  authenticate,
  requireOrganizer,
  validate({ params: eventIdParamsSchema }),
  eventsController.deleteEvent
);

router.post(
  "/:eventId/tiers",
  authenticate,
  requireOrganizer,
  validate({ params: eventIdParamsSchema, body: createTierSchema }),
  eventsController.createTier
);
router.patch(
  "/:eventId/tiers/:tierId",
  authenticate,
  requireOrganizer,
  validate({ params: tierIdParamsSchema, body: updateTierSchema }),
  eventsController.updateTier
);
router.delete(
  "/:eventId/tiers/:tierId",
  authenticate,
  requireOrganizer,
  validate({ params: tierIdParamsSchema }),
  eventsController.deleteTier
);

router.post(
  "/:eventId/check-in",
  authenticate,
  requireOrganizer,
  checkInRateLimiter,
  validate({ params: eventIdParamsSchema, body: checkInBodySchema }),
  ticketsController.checkIn
);

export default router;
