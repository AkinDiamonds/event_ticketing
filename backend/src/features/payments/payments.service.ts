import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";
import {
  findOrderByReference,
  findTicketByCode,
  fulfillOrder,
  getOrderWithItems,
  markPaymentException,
  type Order,
  type TicketInsert,
} from "#features/orders/index.js";
import { findUserById } from "#features/auth/index.js";
import { findEventById } from "#features/events/index.js";
import { sendTicketEmail, sendTicketWhatsApp } from "#features/notifications/index.js";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

type FulfilledOrder = {
  order: Order;
  ticketCodes: string[];
};

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const hash = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest();
  return timingSafeEqual(hash, Buffer.from(signature, "hex"));
}

export async function handleChargeSuccess(reference: string): Promise<FulfilledOrder | undefined> {
  const order = await findOrderByReference(reference);

  if (!order) {
    logger.warn("handleChargeSuccess: no order found for reference", { reference });
    return;
  }

  if (order.status === "paid" || order.status === "payment_exception") return;
  const verified = await verifyPaystackTransaction(reference);

  if (verified.amount !== order.totalKobo || (order.paystackSubaccount && verified.currency !== "NGN")) {
    logger.error(
      "handleChargeSuccess: amount mismatch — possible price manipulation, marking payment_exception",
      {
        reference,
        orderId: order.id,
        expected: order.totalKobo,
        received: verified.amount,
      }
    );
    await markPaymentException(order.id);
    return;
  }

  if (order.status !== "pending" || verified.paidAt > order.reservationExpiresAt) {
    await markPaymentException(order.id);
    return;
  }

  const orderWithItems = await getOrderWithItems(order.id);
  if (!orderWithItems?.items.length) {
    logger.error("handleChargeSuccess: order items not found, marking payment_exception", {
      orderId: order.id,
      reference,
    });
    await markPaymentException(order.id);
    return;
  }

  const totalTickets = orderWithItems.items.reduce((sum, item) => sum + item.quantity, 0);
  const codes = await generateUniqueCodes(totalTickets);

  const ticketsToInsert: TicketInsert[] = [];
  let codeIndex = 0;
  for (const item of orderWithItems.items) {
    for (let i = 0; i < item.quantity; i++) {
      ticketsToInsert.push({
        orderId: order.id,
        ticketTierId: item.ticketTierId,
        code: codes[codeIndex++]!,
      });
    }
  }

  const createdTickets = await fulfillOrder(order.id, ticketsToInsert, verified.paidAt);
  if (createdTickets.length) {
    return { order, ticketCodes: createdTickets.map((ticket) => ticket.code) };
  }
}

export async function notifyBuyer({ order, ticketCodes }: FulfilledOrder): Promise<void> {
  const buyer = await findUserById(order.buyerId);
  if (buyer) {
    const event = await findEventById(order.eventId);
    const eventTitle = event?.title ?? "Your Event";

    await sendTicketEmail({
      to: buyer.email,
      eventTitle,
      ticketCodes,
      eventId: order.eventId,
      orderId: order.id,
    });

    await sendTicketWhatsApp({
      phone: buyer.whatsappNumber,
      eventTitle,
      ticketCodes,
    });
  }
}

async function verifyPaystackTransaction(reference: string): Promise<{
  amount: number;
  paidAt: Date;
  currency?: string | undefined;
}> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    throw new Error(`Paystack /verify returned ${response.status}`);
  }

  const json = (await response.json()) as {
    status: boolean;
    data?: { status?: string; amount?: number; paid_at?: string; paidAt?: string; currency?: string };
  };

  const { status, amount, paid_at, paidAt: alternateTime, currency } = json.data ?? {};
  const paidAt = new Date(paid_at ?? alternateTime ?? "");
  if (!json.status || status !== "success" || typeof amount !== "number"
    || !Number.isSafeInteger(amount) || !Number.isFinite(paidAt.getTime())) {
    throw new Error("Paystack /verify did not confirm the payment");
  }

  return { amount, paidAt, currency };
}

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

async function generateUniqueCodes(count: number): Promise<string[]> {
  const codes: string[] = [];
  const seen = new Set<string>();
  const MAX_ATTEMPTS = count * 20;
  let attempts = 0;

  while (codes.length < count) {
    if (++attempts > MAX_ATTEMPTS) {
      throw new Error("generateUniqueCodes: exceeded max attempts generating unique codes");
    }
    const candidate = generateCode();
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    const existing = await findTicketByCode(candidate);
    if (!existing) {
      codes.push(candidate);
    }
  }
  return codes;
}
