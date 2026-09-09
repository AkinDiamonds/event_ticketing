import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "#shared/utils/errors.js";
import { sendError } from "#shared/utils/response.js";
import logger from "#shared/utils/logger.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    // Known, intentional error — log at warn level, return the structured payload.
    logger.warn(err.message, { statusCode: err.statusCode });
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Unexpected error — log full detail, never leak internals to the client.
  logger.error("Unhandled error", { err });
  sendError(res, "Internal server error", 500);
};
