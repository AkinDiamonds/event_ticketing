import type { Request, Response } from "express";
import { sendSuccess } from "#shared/utils/response.js";
import { checkoutSchema, orderIdParamSchema } from "./orders.schemas.js";
import * as ordersService from "./orders.service.js";

export async function checkout(req: Request, res: Response): Promise<void> {
  const body = checkoutSchema.parse(req.body);
  const result = await ordersService.checkout(
    req.user!.userId,
    req.user!.email,
    req.user!.isEmailVerified,
    body
  );
  sendSuccess(res, result, "Checkout initialized", 201);
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const { orderId } = orderIdParamSchema.parse(req.params);
  const result = await ordersService.getOrderStatus(orderId, req.user!.userId);
  sendSuccess(res, result, "Order retrieved");
}

export async function cleanupExpired(_req: Request, res: Response): Promise<void> {
  const result = await ordersService.cleanupExpiredReservations();
  sendSuccess(res, result, `Cleaned up ${result.processed} expired reservations`);
}
