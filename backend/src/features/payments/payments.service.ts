import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "#config/env.js";
import logger from "#shared/utils/logger.js";
import {
  findOrderByReference,
  findTicketByCode,
  fulfillOrder,
  getOrderWithItems,
  updateOrderStatus,
  type TicketInsert,
} from "#features/orders/orders.repository.js";
import { findUserById } from "#features/auth/index.js";
import { findEventById } from "#features/events/index.js";
import { sendTicketEmail, sendTicketWhatsApp } from "#features/notifications/index.js";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const hash = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  try {
    const hashBuf = Buffer.from(hash, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (hashBuf.length === 0 || hashBuf.length !== sigBuf.length) {
      return false;
    }
    return timingSafeEqual(hashBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function handleChargeSuccess(reference: string): Promise<void> {
  const order = await findOrderByReference(reference);

  if (!order) {
    logger.warn("handleChargeSuccess: no order found for reference", { reference });
    return;
  }

  if (order.status === "paid") {
    logger.info("handleChargeSuccess: duplicate webhook ignored (already paid)", {
      orderId: order.id,
      reference,
    });
    return;
  }

  if (order.status !== "pending") {
    logger.warn("handleChargeSuccess: order in unexpected status, skipping fulfillment", {
      orderId: order.id,
      reference,
      status: order.status,
    });
    return;
  }

  // Independent verification — never trust the webhook body amount alone.
  let verified: { status: string; amount: number };
  try {
    verified = await verifyPaystackTransaction(reference);
  } catch (err) {
    logger.error("handleChargeSuccess: Paystack verify call failed", { reference, err });
    return;
  }

  if (verified.status !== "success") {
    logger.warn("handleChargeSuccess: Paystack reports payment not successful", {
      reference,
      paystackStatus: verified.status,
    });
    return;
  }

  if (verified.amount !== order.totalKobo) {
    logger.error(
      "handleChargeSuccess: amount mismatch — possible price manipulation, marking payment_exception",
      {
        reference,
        orderId: order.id,
        expected: order.totalKobo,
        received: verified.amount,
      }
    );
    await updateOrderStatus(order.id, "payment_exception");
    return;
  }

  if (order.reservationExpiresAt < new Date()) {
    logger.error(
      "handleChargeSuccess: reservation expired before payment verified, marking payment_exception",
      {
        reference,
        orderId: order.id,
        reservationExpiresAt: order.reservationExpiresAt,
      }
    );
    await updateOrderStatus(order.id, "payment_exception");
    return;
  }

  const orderWithItems = await getOrderWithItems(order.id);
  if (!orderWithItems) {
    logger.error("handleChargeSuccess: order items not found, marking payment_exception", {
      orderId: order.id,
      reference,
    });
    await updateOrderStatus(order.id, "payment_exception");
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

  try {
    await fulfillOrder(order.id, ticketsToInsert);
    logger.info("handleChargeSuccess: order fulfilled successfully", {
      orderId: order.id,
      reference,
      ticketCount: ticketsToInsert.length,
    });
  } catch (err) {
    logger.error(
      "handleChargeSuccess: FULFILLMENT_FAILED_AFTER_PAYMENT — manual remediation required",
      {
        orderId: order.id,
        reference,
        err,
      }
    );
    // Leave order as pending so a retry can attempt fulfillment again.
    // Do not mark as payment_exception unless we are certain money was lost.
    return;
  }

  const buyer = await findUserById(order.buyerId);
  if (buyer) {
    const event = await findEventById(order.eventId);
    const eventTitle = event?.title ?? "Your Event";
    const ticketCodes = ticketsToInsert.map((t) => t.code);

    await sendTicketEmail({
      to: buyer.email,
      eventTitle,
      ticketCodes,
    });

    await sendTicketWhatsApp({
      phone: buyer.whatsappNumber,
      eventTitle,
      ticketCodes,
    });
  }
}

async function verifyPaystackTransaction(reference: string): Promise<{
  status: string;
  amount: number;
}> {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Paystack /verify returned ${response.status}`);
  }

  const json = (await response.json()) as {
    status: boolean;
    data: { status: string; amount: number };
  };

  if (!json.status || !json.data) {
    throw new Error("Paystack /verify response malformed");
  }

  return { status: json.data.status, amount: json.data.amount };
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
