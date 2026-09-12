import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import * as eventsService from "./events.service.js";
import {
  createEventSchema,
  createTierSchema,
  eventIdParamsSchema,
  listEventsQuerySchema,
  tierIdParamsSchema,
  updateEventSchema,
  updateTierSchema,
} from "./events.schemas.js";

export async function listEvents(req: Request, res: Response): Promise<void> {
  const result = await eventsService.listEvents(listEventsQuerySchema.parse(req.query));
  sendSuccess(res, result, "Events retrieved successfully");
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = eventIdParamsSchema.parse(req.params);
  const result = await eventsService.getEvent(eventId);
  sendSuccess(res, result, "Event retrieved successfully");
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const result = await eventsService.createEvent(
    req.user!.userId,
    createEventSchema.parse(req.body)
  );
  sendSuccess(res, result, "Event created successfully", 201);
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = eventIdParamsSchema.parse(req.params);
  const result = await eventsService.editEvent(
    req.user!.userId,
    eventId,
    updateEventSchema.parse(req.body)
  );
  sendSuccess(res, result, "Event updated successfully");
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = eventIdParamsSchema.parse(req.params);
  await eventsService.deleteEvent(req.user!.userId, eventId);
  sendSuccess(res, null, "Event deleted successfully");
}

export async function createTier(req: Request, res: Response): Promise<void> {
  const { eventId } = eventIdParamsSchema.parse(req.params);
  const result = await eventsService.addTier(
    req.user!.userId,
    eventId,
    createTierSchema.parse(req.body)
  );
  sendSuccess(res, result, "Ticket tier created successfully", 201);
}

export async function updateTier(req: Request, res: Response): Promise<void> {
  const { eventId, tierId } = tierIdParamsSchema.parse(req.params);
  const result = await eventsService.editTier(
    req.user!.userId,
    eventId,
    tierId,
    updateTierSchema.parse(req.body)
  );
  sendSuccess(res, result, "Ticket tier updated successfully");
}

export async function deleteTier(req: Request, res: Response): Promise<void> {
  const { eventId, tierId } = tierIdParamsSchema.parse(req.params);
  await eventsService.removeTier(req.user!.userId, eventId, tierId);
  sendSuccess(res, null, "Ticket tier deleted successfully");
}