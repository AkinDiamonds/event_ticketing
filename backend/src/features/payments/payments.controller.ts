import type { Request, Response } from "express";
import logger from "#shared/utils/logger.js";
import * as paymentsService from "./payments.service.js";

export function handleWebhook(req: Request, res: Response): void {
  const signature = req.headers["x-paystack-signature"];

  if (typeof signature !== "string" || !signature) {
    res.status(401).json({ message: "Missing signature" });
    return;
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : typeof req.body === "string"
      ? Buffer.from(req.body, "utf8")
      : Buffer.from(JSON.stringify(req.body || {}), "utf8");

  const isValid = paymentsService.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    res.status(401).json({ message: "Invalid signature" });
    return;
  }

  // Respond 200 before processing — Paystack retries if we don't reply fast enough.
  res.status(200).json({ received: true });

  let event: { event: string; data: { reference: string } };
  try {
    event = JSON.parse(rawBody.toString("utf8")) as typeof event;
  } catch {
    logger.error("handleWebhook: failed to parse webhook body after signature verified");
    return;
  }

  if (event.event === "charge.success") {
    paymentsService.handleChargeSuccess(event.data.reference).catch((err: unknown) => {
      logger.error("handleWebhook: unhandled error in handleChargeSuccess", {
        reference: event.data.reference,
        err,
      });
    });
  }
}
