import type { NextFunction, Request, Response } from "express";
import { findUserById, isApprovedOrganizer } from "#features/auth/index.js";
import { ForbiddenError, UnauthorizedError } from "#shared/utils/errors.js";

export async function requireOrganizer(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next(new UnauthorizedError("Missing access token"));
    return;
  }

  const user = await findUserById(req.user.userId);
  if (!user || !isApprovedOrganizer(user)) {
    next(new ForbiddenError("Approved organizer access required"));
    return;
  }

  next();
}
