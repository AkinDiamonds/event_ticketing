import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "#shared/utils/errors.js";
import { verifyAccessToken } from "#shared/utils/tokens.js";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const [scheme, token] = header?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(new UnauthorizedError("Missing access token"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}
