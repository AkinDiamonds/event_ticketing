import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "#shared/middleware/authenticate.js";
import { requireOrganizer } from "#shared/middleware/require-organizer.js";
import { validate } from "#shared/middleware/validate.js";
import { env } from "#config/env.js";
import { checkoutSchema, orderIdParamSchema } from "./orders.schemas.js";
import * as ordersController from "./orders.controller.js";

const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
});

const router = Router();

router.post(
  "/checkout",
  authenticate,
  checkoutRateLimiter,
  validate({ body: checkoutSchema }),
  ordersController.checkout
);

router.post(
  "/admin/cleanup-expired",
  authenticate,
  requireOrganizer,
  ordersController.cleanupExpired
);

router.get(
  "/:orderId",
  authenticate,
  validate({ params: orderIdParamSchema }),
  ordersController.getOrder
);

export default router;
