import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import { type CheckInBodyInput, type CheckInParamInput } from "./tickets.schemas.js";
import * as ticketsService from "./tickets.service.js";

export async function checkIn(req: Request, res: Response): Promise<void> {
  const { eventId } = req.params as CheckInParamInput;
  const { code } = req.body as CheckInBodyInput;

  const result = await ticketsService.checkInTicket(
    eventId,
    req.user!.userId,
    code
  );

  sendSuccess(res, result, "Check-in successful", 200);
}
