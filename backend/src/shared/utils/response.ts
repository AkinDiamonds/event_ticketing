import type { Response } from "express";

export interface SuccessPayload<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

export interface ErrorPayload {
  success: false;
  statusCode: number;
  message: string;
  errors?: unknown[] | undefined;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "OK",
  statusCode = 200
): void {
  const payload: SuccessPayload<T> = { success: true, statusCode, message, data };
  res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown[]
): void {
  const payload: ErrorPayload = { success: false, statusCode, message, errors };
  res.status(statusCode).json(payload);
}
