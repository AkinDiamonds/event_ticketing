import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

import { z } from "zod";
import { confirmPayoutSchema, payoutBankDetails } from "./payouts.service.js";

export function registerPaymentsOpenApi(registry: OpenAPIRegistry): void {
  const webhookHeadersSchema = z.object({
    "x-paystack-signature": z
      .string()
      .openapi({ description: "HMAC SHA512 signature computed with Paystack secret key" }),
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/payments/webhook",
    description: "Paystack webhook endpoint for charge.success notifications",
    request: {
      headers: webhookHeadersSchema,
    },
    responses: {
      200: { description: "Payment outcome recorded or event already handled" },
      400: { description: "Invalid webhook payload" },
      401: { description: "Missing or invalid signature" },
      503: { description: "Payment processing temporarily unavailable; retry delivery" },
    },
  });

  const payoutPath = "/api/v1/payments/organizer/payouts";
  const organizer = [{ bearerAuth: [] }];
  for (const [suffix, description] of [
    ["", "Masked payout account or null"],
    ["/banks", "Available Nigerian banks"],
    ["/terms", "Current platform fee and processing fee bearer"],
    ["/settlements", "Recent settlements for the organizer’s payout account"],
  ] as const) {
    registry.registerPath({
      method: "get", path: payoutPath + suffix, security: organizer,
      responses: { 200: { description }, 403: { description: "Organizer access required" } },
    });
  }
  registry.registerPath({
    method: "post", path: payoutPath + "/resolve", security: organizer,
    request: { body: { content: { "application/json": { schema: payoutBankDetails } } } },
    responses: { 200: { description: "Resolved bank account name" } },
  });
  registry.registerPath({
    method: "post", path: payoutPath, security: organizer,
    request: { body: { content: { "application/json": { schema: confirmPayoutSchema } } } },
    responses: {
      201: { description: "Payout account saved" },
      403: { description: "Organizer access and correct password required" },
      409: { description: "Account already linked or bank details changed" },
    },
  });
}
