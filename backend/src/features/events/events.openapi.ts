import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
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

const jsonBody = (schema: object) => ({
  body: { content: { "application/json": { schema } } },
});

export function registerEventsOpenApi(registry: OpenAPIRegistry): void {
  registry.register("CreateEventRequest", createEventSchema);
  registry.register("UpdateEventRequest", updateEventSchema);
  registry.register("CreateTierRequest", createTierSchema);
  registry.register("UpdateTierRequest", updateTierSchema);
  registry.register("CheckInRequest", checkInBodySchema);
  registry.register("EventIdParams", eventIdParamsSchema);
  registry.register("TierIdParams", tierIdParamsSchema);
  registry.register("ListEventsQuery", listEventsQuerySchema);

  registry.registerPath({
    method: "get",
    path: "/api/v1/events",
    request: { query: listEventsQuerySchema },
    responses: { 200: { description: "Events retrieved successfully" } },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/events/{eventId}",
    request: { params: eventIdParamsSchema },
    responses: { 200: { description: "Event retrieved successfully" } },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/events/organizer",
    security: [{ bearerAuth: [] }],
    request: { query: listEventsQuerySchema },
    responses: { 200: { description: "Events owned by the current organizer" } },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/events/organizer/{eventId}",
    security: [{ bearerAuth: [] }],
    request: { params: eventIdParamsSchema },
    responses: {
      200: { description: "Owned event and ticket tier inventory" },
      404: { description: "Event not found" },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/events",
    security: [{ bearerAuth: [] }],
    request: jsonBody(createEventSchema),
    responses: {
      201: { description: "Private event draft created and workspace enabled" },
      403: { description: "Verified, eligible account required" },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/events/{eventId}/publish",
    security: [{ bearerAuth: [] }],
    request: { params: eventIdParamsSchema },
    responses: {
      200: { description: "Event published" },
      404: { description: "Event not found" },
      409: { description: "A payout account and an enabled paid tier are required" },
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/events/{eventId}",
    security: [{ bearerAuth: [] }],
    request: { params: eventIdParamsSchema, ...jsonBody(updateEventSchema) },
    responses: { 200: { description: "Event updated successfully" } },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/events/{eventId}",
    security: [{ bearerAuth: [] }],
    request: { params: eventIdParamsSchema },
    responses: { 200: { description: "Event deleted successfully" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/events/{eventId}/tiers",
    security: [{ bearerAuth: [] }],
    request: { params: eventIdParamsSchema, ...jsonBody(createTierSchema) },
    responses: { 201: { description: "Ticket tier created successfully" } },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/events/{eventId}/tiers/{tierId}",
    security: [{ bearerAuth: [] }],
    request: { params: tierIdParamsSchema, ...jsonBody(updateTierSchema) },
    responses: { 200: { description: "Ticket tier updated successfully" } },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/v1/events/{eventId}/tiers/{tierId}",
    security: [{ bearerAuth: [] }],
    request: { params: tierIdParamsSchema },
    responses: { 200: { description: "Ticket tier deleted successfully" } },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/events/{eventId}/check-in",
    security: [{ bearerAuth: [] }],
    request: { params: eventIdParamsSchema, ...jsonBody(checkInBodySchema) },
    responses: {
      200: { description: "Ticket checked in successfully" },
      404: { description: "Ticket not found or belongs to another event" },
      409: { description: "Ticket already checked in" },
    },
  });
}
