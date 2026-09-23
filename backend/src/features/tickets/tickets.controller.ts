import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import { checkInBodySchema, checkInParamSchema } from "./tickets.schemas.js";
import * as ticketsService from "./tickets.service.js";

export async function checkIn(req: Request, res: Response): Promise<void> {
  const { eventId } = checkInParamSchema.parse(req.params);
  const { code } = checkInBodySchema.parse(req.body);

  const result = await ticketsService.checkInTicket(
    eventId,
    req.user!.userId,
    code
  );

  sendSuccess(res, result, "Check-in successful", 200);
}
