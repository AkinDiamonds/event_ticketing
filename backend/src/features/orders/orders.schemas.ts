import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

import { env } from "#config/env.js";

extendZodWithOpenApi(z);

export const checkoutSchema = z.object({
  eventId: z.string().uuid(),
  items: z
    .array(
      z.object({
        tierId: z.string().uuid(),
        quantity: z.coerce.number().int().positive().min(1).max(10, "Max 10 tickets per tier"),
      })
    )
    .min(1, "At least one ticket must be selected")
    .max(10, "Max 10 tickets per order"),
  callbackUrl: z
    .string()
    .url()
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return env.corsOrigins.some((origin) => origin === parsed.origin || origin === "*");
        } catch {
          return false;
        }
      },
      { message: "callbackUrl must match an allowed origin" }
    ),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

export type CheckoutSchema = z.infer<typeof checkoutSchema>;
export type OrderIdParamSchema = z.infer<typeof orderIdParamSchema>;
