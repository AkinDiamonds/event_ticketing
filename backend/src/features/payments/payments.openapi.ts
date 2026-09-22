import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

import { z } from "zod";

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
      200: { description: "Webhook received and verified" },
      401: { description: "Missing or invalid signature" },
    },
  });
}
