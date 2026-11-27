import { randomBytes } from "node:crypto";
import { env } from "#config/env.js";
import { paymentPolicy } from "#features/payments/index.js";
import logger from "#shared/utils/logger.js";
import { AppError, EmailNotVerifiedError, NotFoundError } from "#shared/utils/errors.js";
import {
  createOrderWithReservation,
  findOrderById,
  getExpiredPendingOrders,
  releaseReservation,
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
  const policy = paymentPolicy();

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
    split: { basisPoints: policy.basisPoints },
  });

  try {
    if (order.platformFeeKobo === null || !order.paystackSubaccount) throw new Error("Order has no payout split");
    const callbackUrl = new URL(`${env.FRONTEND_URL}/tickets/${encodeURIComponent(order.eventId)}/success`);
    callbackUrl.searchParams.set("orderId", order.id);
    const authorizationUrl = await initializePaystackTransaction({
      email: userEmail,
      amount: order.totalKobo,
      reference: paystackReference,
      callbackUrl: callbackUrl.href,
      subaccount: order.paystackSubaccount,
      platformFeeKobo: order.platformFeeKobo,
      bearer: policy.bearer,
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

    await releaseReservation(order.id, "failed");

    throw new AppError(502, "Payment provider unavailable. Please try again shortly.");
  }
}

export async function getOrderStatus(orderId: string, buyerId: string): Promise<Omit<Order, "paystackSubaccount" | "platformFeeKobo">> {
  const order = await findOrderById(orderId, buyerId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  return {
    id: order.id, buyerId: order.buyerId, eventId: order.eventId, totalKobo: order.totalKobo,
    status: order.status, paystackReference: order.paystackReference,
    reservationExpiresAt: order.reservationExpiresAt, createdAt: order.createdAt,
    updatedAt: order.updatedAt, deletedAt: order.deletedAt,
  };
}

export async function cleanupExpiredReservations(): Promise<{ processed: number }> {
  const expired = await getExpiredPendingOrders();

  let processed = 0;
  for (const order of expired) {
    try {
      if (await releaseReservation(order.id, "expired")) processed++;
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
  subaccount: string;
  platformFeeKobo: number;
  bearer: "account" | "subaccount";
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
      currency: "NGN",
      subaccount: input.subaccount,
      transaction_charge: input.platformFeeKobo,
      bearer: input.bearer,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Paystack /transaction/initialize returned ${response.status}`);
  }

  const json = (await response.json()) as {
    status: boolean;
    data: { authorization_url: string };
  };

  if (!json.status || !json.data?.authorization_url) {
    throw new Error("Paystack response missing authorization_url");
  }

  const url = new URL(json.data.authorization_url);
  if (url.origin !== "https://checkout.paystack.com" || url.username || url.password) {
    throw new Error("Paystack checkout URL did not match the expected origin");
  }
  return url.href;
}
