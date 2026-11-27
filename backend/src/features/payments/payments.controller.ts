import type { Request, Response } from "express";
import { z } from "zod";
import logger from "#shared/utils/logger.js";
import * as paymentsService from "./payments.service.js";

const envelopeSchema = z.object({ event: z.string(), data: z.unknown() });
const chargeSchema = z.object({ reference: z.string().min(1).max(100) });

export async function handleWebhook(req: Request, res: Response): Promise<void> {
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

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ message: "Invalid webhook payload" });
    return;
  }

  const event = envelopeSchema.safeParse(payload);
  if (!event.success) {
    res.status(400).json({ message: "Invalid webhook payload" });
    return;
  }
  if (event.data.event !== "charge.success") {
    res.status(200).json({ received: true });
    return;
  }

  const charge = chargeSchema.safeParse(event.data.data);
  if (!charge.success) {
    res.status(400).json({ message: "Missing payment reference" });
    return;
  }

  const { reference } = charge.data;
  try {
    const fulfillment = await paymentsService.handleChargeSuccess(reference);
    res.status(200).json({ received: true });
    if (fulfillment) {
      void paymentsService.notifyBuyer(fulfillment).catch((err: unknown) => {
        logger.error("Failed to notify buyer after fulfillment", { reference, err });
      });
    }
  } catch (err) {
    logger.error("Could not complete payment webhook", { reference, err });
    res.status(503).json({ message: "Payment processing temporarily unavailable" });
  }
}
