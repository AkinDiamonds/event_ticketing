import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { checkoutSchema, orderIdParamSchema } from "./orders.schemas.js";

const jsonBody = (schema: object) => ({
  body: { content: { "application/json": { schema } } },
});

export function registerOrdersOpenApi(registry: OpenAPIRegistry): void {
  registry.register("CheckoutRequest", checkoutSchema);
  registry.register("OrderIdParams", orderIdParamSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v1/orders/checkout",
    security: [{ bearerAuth: [] }],
    request: jsonBody(checkoutSchema),
    responses: {
      201: { description: "Checkout initialized successfully" },
      400: { description: "Invalid request payload" },
      403: { description: "Email not verified" },
      404: { description: "Event or tier not found" },
      409: { description: "Insufficient ticket stock" },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/orders/{orderId}",
    security: [{ bearerAuth: [] }],
    request: { params: orderIdParamSchema },
    responses: {
      200: { description: "Order retrieved successfully" },
      404: { description: "Order not found" },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/orders/admin/cleanup-expired",
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: "Cleaned up expired reservations" },
      403: { description: "Organizer role required" },
    },
  });
}
