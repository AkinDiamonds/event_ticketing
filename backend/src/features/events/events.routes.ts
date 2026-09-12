import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "#shared/middleware/authenticate.js";
import { requireOrganizer } from "#shared/middleware/require-organizer.js";
import { validate } from "#shared/middleware/validate.js";
import {
  createEventSchema,
  createTierSchema,
  eventIdParamsSchema,
  listEventsQuerySchema,
  tierIdParamsSchema,
  updateEventSchema,
  updateTierSchema,
} from "./events.schemas.js";
import * as eventsController from "./events.controller.js";

const publicEventsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
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

export default router;