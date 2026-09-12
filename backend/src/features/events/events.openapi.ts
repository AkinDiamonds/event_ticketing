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

const jsonBody = (schema: object) => ({
  body: { content: { "application/json": { schema } } },
});

export function registerEventsOpenApi(registry: OpenAPIRegistry): void {
  registry.register("CreateEventRequest", createEventSchema);
  registry.register("UpdateEventRequest", updateEventSchema);
  registry.register("CreateTierRequest", createTierSchema);
  registry.register("UpdateTierRequest", updateTierSchema);
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
    method: "post",
    path: "/api/v1/events",
    security: [{ bearerAuth: [] }],
    request: jsonBody(createEventSchema),
    responses: { 201: { description: "Event created successfully" } },
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
}