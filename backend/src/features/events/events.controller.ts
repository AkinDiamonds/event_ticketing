import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import * as eventsService from "./events.service.js";
import {
  type CreateEventInput,
  type UpdateEventInput,
  type CreateTierInput,
  type UpdateTierInput,
  type ListEventsQuery,
} from "./events.schemas.js";

export async function listEvents(req: Request, res: Response): Promise<void> {
  const result = await eventsService.listEvents(req.query as ListEventsQuery);
  sendSuccess(res, result, "Events retrieved successfully");
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params as { eventId: string };
  const result = await eventsService.getEvent(eventId);
  sendSuccess(res, result, "Event retrieved successfully");
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const result = await eventsService.createEvent(
    req.user!.userId,
    req.body as CreateEventInput
  );
  sendSuccess(res, result, "Event created successfully", 201);
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params as { eventId: string };
  const result = await eventsService.editEvent(
    req.user!.userId,
    eventId,
    req.body as UpdateEventInput
  );
  sendSuccess(res, result, "Event updated successfully");
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params as { eventId: string };
  await eventsService.deleteEvent(req.user!.userId, eventId);
  sendSuccess(res, null, "Event deleted successfully");
}

export async function createTier(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params as { eventId: string };
  const result = await eventsService.addTier(
    req.user!.userId,
    eventId,
    req.body as CreateTierInput
  );
  sendSuccess(res, result, "Ticket tier created successfully", 201);
}

export async function updateTier(req: Request, res: Response): Promise<void> {
  const { eventId, tierId } = req.params as { eventId: string; tierId: string };
  const result = await eventsService.editTier(
    req.user!.userId,
    eventId,
    tierId,
    req.body as UpdateTierInput
  );
  sendSuccess(res, result, "Ticket tier updated successfully");
}

export async function deleteTier(req: Request, res: Response): Promise<void> {
  const { eventId, tierId } = req.params as { eventId: string; tierId: string };
  await eventsService.removeTier(req.user!.userId, eventId, tierId);
  sendSuccess(res, null, "Ticket tier deleted successfully");
}
