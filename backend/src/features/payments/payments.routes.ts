import { Router } from "express";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "#config/env.js";
import { authenticate } from "#shared/middleware/authenticate.js";
import { requireOrganizer } from "#shared/middleware/require-organizer.js";
import { validate } from "#shared/middleware/validate.js";
import { sendSuccess } from "#shared/utils/response.js";
import * as paymentsController from "./payments.controller.js";
import {
  confirmPayoutAccount, confirmPayoutSchema, getPayoutAccount, listOrganizerSettlements,
  listPayoutBanks, payoutBankDetails, payoutTerms, resolvePayoutAccount,
} from "./payouts.service.js";

const router = Router();

router.post("/webhook", express.raw({ type: "*/*" }), paymentsController.handleWebhook);

const payouts = Router();
payouts.use(authenticate, requireOrganizer, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
payouts.use(rateLimit({
  windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: "draft-8", legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
}));
payouts.use(express.json());
const payoutChangesRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (req) => req.user!.userId,
  skip: () => env.NODE_ENV === "test",
});
payouts.get("/", async (req, res) => {
  sendSuccess(res, await getPayoutAccount(req.user!.userId));
});
payouts.get("/banks", async (_req, res) => {
  sendSuccess(res, await listPayoutBanks());
});
payouts.get("/terms", (_req, res) => {
  sendSuccess(res, payoutTerms());
});
payouts.get("/settlements", async (req, res) => {
  sendSuccess(res, await listOrganizerSettlements(req.user!.userId));
});
payouts.post("/resolve", payoutChangesRateLimit, validate({ body: payoutBankDetails }), async (req, res) => {
  sendSuccess(res, await resolvePayoutAccount(payoutBankDetails.parse(req.body)));
});
payouts.post("/", payoutChangesRateLimit, validate({ body: confirmPayoutSchema }), async (req, res) => {
  sendSuccess(res, await confirmPayoutAccount(req.user!.userId, confirmPayoutSchema.parse(req.body)), "Payout account configured", 201);
});
router.use("/organizer/payouts", payouts);

export default router;
