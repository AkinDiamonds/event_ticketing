import { randomBytes } from "node:crypto";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";
import { AppError, EmailNotVerifiedError, NotFoundError } from "#shared/utils/errors.js";
import {
  createOrderWithReservation,
  findOrderById,
  getExpiredPendingOrders,
  getOrderWithItems,
  releaseReservation,
  updateOrderStatus,
  type Order,
} from "./orders.repository.js";
import type { CheckoutSchema } from "./orders.schemas.js";

type CheckoutResult = {
  orderId: string;
  authorizationUrl: string;
  reference: string;
};

export async function checkout(
  userId: string,
  userEmail: string,
  isEmailVerified: boolean,
  input: CheckoutSchema
): Promise<CheckoutResult> {
  if (!isEmailVerified) {
    throw new EmailNotVerifiedError("Email must be verified before purchasing tickets");
  }

  const paystackReference = `TKT-${randomBytes(8).toString("hex")}`;
  const reservationExpiresAt = new Date(
    Date.now() + env.ORDER_RESERVATION_MINUTES * 60 * 1000
  );

  const order = await createOrderWithReservation({
    buyerId: userId,
    eventId: input.eventId,
    items: input.items,
    paystackReference,
    reservationExpiresAt,
  });

  try {
    const authorizationUrl = await initializePaystackTransaction({
      email: userEmail,
      amount: order.totalKobo,
      reference: paystackReference,
      callbackUrl: input.callbackUrl,
    });

    logger.info("checkout: Paystack transaction initialized", {
      orderId: order.id,
      reference: paystackReference,
      totalKobo: order.totalKobo,
    });

    return { orderId: order.id, authorizationUrl, reference: paystackReference };
  } catch (err) {
    logger.error("checkout: Paystack initialization failed, releasing reservation", {
      orderId: order.id,
      reference: paystackReference,
      err,
    });

    const orderWithItems = await getOrderWithItems(order.id);
    if (orderWithItems) {
      await releaseReservation(order.id, orderWithItems.items, "failed");
    } else {
      await updateOrderStatus(order.id, "failed");
    }

    throw new AppError(502, "Payment provider unavailable. Please try again shortly.");
  }
}

export async function getOrderStatus(orderId: string, buyerId: string): Promise<Order> {
  const order = await findOrderById(orderId, buyerId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  return order;
}

export async function cleanupExpiredReservations(): Promise<{ processed: number }> {
  const expired = await getExpiredPendingOrders();

  let processed = 0;
  for (const order of expired) {
    try {
      const orderWithItems = await getOrderWithItems(order.id);
      if (!orderWithItems) continue;
      await releaseReservation(order.id, orderWithItems.items, "expired");
      processed++;
    } catch (err) {
      logger.error("cleanupExpiredReservations: failed to release order", {
        orderId: order.id,
        err,
      });
    }
  }

  logger.info("cleanupExpiredReservations: complete", { processed, total: expired.length });
  return { processed };
}

async function initializePaystackTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
}): Promise<string> {
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      reference: input.reference,
      callback_url: input.callbackUrl,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Paystack /transaction/initialize returned ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    status: boolean;
    data: { authorization_url: string };
  };

  if (!json.status || !json.data?.authorization_url) {
    throw new Error("Paystack response missing authorization_url");
  }

  return json.data.authorization_url;
}
