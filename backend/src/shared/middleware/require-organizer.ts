import type { NextFunction, Request, Response } from "express";
import { findUserById } from "#features/auth/index.js";
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
  if (!user?.isOrganizer) {
    next(new ForbiddenError("Organizer access required"));
    return;
  }

  next();
}