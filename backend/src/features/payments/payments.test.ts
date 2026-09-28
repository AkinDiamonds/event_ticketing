import { createHmac, randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import { env } from "#config/env.js";
import { users } from "#features/auth/auth.schema.js";
import { events, ticketTiers } from "#features/events/events.schema.js";
import { orders, orderItems, tickets } from "#features/orders/orders.schema.js";
import { createOrderWithReservation } from "#features/orders/orders.repository.js";
import { handleChargeSuccess, verifyWebhookSignature } from "./payments.service.js";

const app = createApp();

function generateSignature(payload: string): string {
  return createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(payload).digest("hex");
}

function mockFetchJson(data: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

beforeEach(async () => {
  vi.restoreAllMocks();
  await getDb().delete(tickets);
  await getDb().delete(orderItems);
  await getDb().delete(orders);
  await getDb().delete(ticketTiers);
  await getDb().delete(events);
  await getDb().delete(users);
});

afterAll(async () => {
  await closeDb();
});

describe("verifyWebhookSignature", () => {
  it("returns true for a valid HMAC SHA512 signature", () => {
    const rawPayload = JSON.stringify({
      event: "charge.success",
      data: { reference: "REF123" },
    });
    const signature = generateSignature(rawPayload);
    const isValid = verifyWebhookSignature(Buffer.from(rawPayload), signature);
    expect(isValid).toBe(true);
  });

  it("returns false for a tampered payload or invalid signature", () => {
    const rawPayload = JSON.stringify({
      event: "charge.success",
      data: { reference: "REF123" },
    });
    const isValid = verifyWebhookSignature(Buffer.from(rawPayload), "invalid-hex-signature");
    expect(isValid).toBe(false);
  });
});

describe("POST /api/v1/payments/webhook", () => {
  it("rejects request when x-paystack-signature is missing", async () => {
    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .send({ event: "charge.success" });

    expect(res.status).toBe(401);
  });

  it("rejects request when x-paystack-signature is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-paystack-signature", "invalid-sig")
      .send({ event: "charge.success" });

    expect(res.status).toBe(401);
  });

  it("responds 200 OK immediately for valid signed webhook", async () => {
    const payload = JSON.stringify({
      event: "charge.success",
      data: { reference: "TKT-NONEXISTENT" },
    });
    const signature = generateSignature(payload);

    const res = await request(app)
      .post("/api/v1/payments/webhook")
      .set("x-paystack-signature", signature)
      .set("Content-Type", "application/json")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

describe("handleChargeSuccess fulfillment", () => {
  async function setupPendingOrderFixture(
    opts: {
      price?: number;
      quantity?: number;
      expired?: boolean;
    } = {}
  ) {
    const price = opts.price ?? 500000;
    const quantity = opts.quantity ?? 2;

    const [user] = await getDb()
      .insert(users)
      .values({
        email: "buyer@example.com",
        passwordHash: "hash",
        isEmailVerified: true,
      })
      .returning();

    const [event] = await getDb()
      .insert(events)
      .values({
        organizerId: user!.id,
        title: "Test Event",
        description: "Test Desc",
        venue: "Venue",
        startsAt: new Date(Date.now() + 86400000),
      })
      .returning();

    const [tier] = await getDb()
      .insert(ticketTiers)
      .values({
        eventId: event!.id,
        name: "Standard",
        price,
        quantityAvailable: 10,
      })
      .returning();

    const ref = `TKT-${randomBytes(8).toString("hex")}`;
    const expiresAt = opts.expired
      ? new Date(Date.now() - 60000)
      : new Date(Date.now() + 900000);

    const order = await createOrderWithReservation({
      buyerId: user!.id,
      eventId: event!.id,
      items: [{ tierId: tier!.id, quantity, unitPriceKobo: price }],
      totalKobo: price * quantity,
      paystackReference: ref,
      reservationExpiresAt: expiresAt,
    });

    return {
      user: user!,
      event: event!,
      tier: tier!,
      order,
      ref,
      totalKobo: price * quantity,
      quantity,
    };
  }

  it("fulfills order, transitions reserved inventory to sold, and generates tickets", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 2 });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo },
      })
    );

    await handleChargeSuccess(fixture.ref);

    const [updatedOrder] = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.id, fixture.order.id));
    expect(updatedOrder?.status).toBe("paid");

    const [updatedTier] = await getDb()
      .select()
      .from(ticketTiers)
      .where(eq(ticketTiers.id, fixture.tier.id));
    expect(updatedTier?.quantityReserved).toBe(0);
    expect(updatedTier?.quantitySold).toBe(fixture.quantity);

    const createdTickets = await getDb()
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, fixture.order.id));
    expect(createdTickets).toHaveLength(fixture.quantity);
    for (const t of createdTickets) {
      expect(t.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      expect(t.status).toBe("valid");
    }
  });

  it("is idempotent on duplicate webhook delivery", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 1 });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo },
      })
    );

    await handleChargeSuccess(fixture.ref);
    // Duplicate webhook call
    await handleChargeSuccess(fixture.ref);

    const createdTickets = await getDb()
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, fixture.order.id));
    expect(createdTickets).toHaveLength(1);

    const [tier] = await getDb()
      .select()
      .from(ticketTiers)
      .where(eq(ticketTiers.id, fixture.tier.id));
    expect(tier?.quantitySold).toBe(1);
    expect(tier?.quantityReserved).toBe(0);
  });

  it("marks order as payment_exception on amount mismatch", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 2 });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: 100 }, // paid only 100 kobo instead of totalKobo
      })
    );

    await handleChargeSuccess(fixture.ref);

    const [updatedOrder] = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.id, fixture.order.id));
    expect(updatedOrder?.status).toBe("payment_exception");

    const createdTickets = await getDb()
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, fixture.order.id));
    expect(createdTickets).toHaveLength(0);
  });

  it("marks order as payment_exception if payment verified after reservation expiry", async () => {
    const fixture = await setupPendingOrderFixture({
      price: 500000,
      quantity: 2,
      expired: true,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo },
      })
    );

    await handleChargeSuccess(fixture.ref);

    const [updatedOrder] = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.id, fixture.order.id));
    expect(updatedOrder?.status).toBe("payment_exception");

    const createdTickets = await getDb()
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, fixture.order.id));
    expect(createdTickets).toHaveLength(0);
  });
});
