import { createHmac, randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import { env } from "#config/env.js";
import { users } from "#features/auth/auth.schema.js";
import { events, ticketTiers } from "#features/events/events.schema.js";
import { orders, orderItems, tickets } from "#features/orders/orders.schema.js";
import { createOrderWithReservation } from "#features/orders/orders.repository.js";
import { handleChargeSuccess, notifyBuyer, verifyWebhookSignature } from "./payments.service.js";
import { MemoryEmailSender } from "#shared/utils/email.js";
import { MemoryWhatsAppSender } from "#shared/utils/whatsapp.js";
import { setEmailSender, setWhatsAppSender } from "#features/notifications/index.js";
import { createAccessToken } from "#shared/utils/tokens.js";
import { hashPassword } from "#shared/utils/password.js";

const app = createApp();
const memoryEmail = new MemoryEmailSender();
const memoryWhatsApp = new MemoryWhatsAppSender();

function generateSignature(payload: string): string {
  return createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(payload).digest("hex");
}

function mockFetchJson(data: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function confirmedPayment(amount: number, paidAt = new Date()): Response {
  return mockFetchJson({
    status: true,
    data: { status: "success", amount, paid_at: paidAt.toISOString() },
  });
}

async function processChargeSuccess(reference: string): Promise<void> {
  const fulfillment = await handleChargeSuccess(reference);
  if (fulfillment) await notifyBuyer(fulfillment);
}

function deliverCharge(reference: string) {
  const payload = JSON.stringify({ event: "charge.success", data: { reference } });
  return request(app).post("/api/v1/payments/webhook")
    .set("Content-Type", "application/json").set("x-paystack-signature", generateSignature(payload)).send(payload);
}

beforeEach(async () => {
  vi.restoreAllMocks();
  memoryEmail.messages.length = 0;
  memoryWhatsApp.messages.length = 0;
  setEmailSender(memoryEmail);
  setWhatsAppSender(memoryWhatsApp);
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

  it("acknowledges a signed event for an unknown order", async () => {
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

it("creates a private draft, sets up owner-only payouts, publishes, and initializes checkout with the server-owned split", async () => {
  const password = "Organizer password 123";
  const [host, buyer] = await getDb().insert(users).values([
    { email: "host@example.com", passwordHash: await hashPassword(password), isEmailVerified: true },
    { email: "buyer@example.com", passwordHash: "unused", isEmailVerified: true },
  ]).returning();
  const bearer = (user: typeof users.$inferSelect) => `Bearer ${createAccessToken({
    userId: user.id, email: user.email, isEmailVerified: true, isOrganizer: false,
  })}`;
  const hostAuth = bearer(host!);
  const buyerAuth = bearer(buyer!);
  const draft = await request(app).post("/api/v1/events").set("Authorization", hostAuth).send({
    title: "Launch Event", description: "A private event until you publish", venue: "Stage",
    startsAt: "2027-06-12T18:00:00.000Z", tiers: [{ name: "Regular", price: 123_456, quantityAvailable: 20 }],
  });
  expect(draft.status).toBe(201);
  const draftData = draft.body as { data: { event: { id: string; isPublished: boolean }; tiers: { id: string }[] } };
  expect(draftData.data.event.isPublished).toBe(false);
  const eventId = draftData.data.event.id;
  const tierId = draftData.data.tiers[0]!.id;
  const checkoutBody = { eventId, items: [{ tierId, quantity: 2 }] };
  const payout = "/api/v1/payments/organizer/payouts";
  const publish = `/api/v1/events/${eventId}/publish`;
  expect((await request(app).get(`/api/v1/events/${eventId}`)).status).toBe(404);
  expect((await request(app).post("/api/v1/orders/checkout").set("Authorization", buyerAuth).send(checkoutBody)).status).toBe(404);
  expect((await request(app).post(publish).set("Authorization", hostAuth)).status).toBe(409);
  expect((await request(app).get(payout).set("Authorization", buyerAuth)).status).toBe(403);

  const account = { bankCode: "058", accountNumber: "0123456047" };
  const paystack = vi.spyOn(globalThis, "fetch").mockImplementation((target, init) => {
    const url = new URL(target instanceof Request ? target.url : target);
    expect(url.origin).toBe("https://api.paystack.co");
    if (url.pathname === "/bank/resolve") {
      expect(url.searchParams.get("account_number")).toBe(account.accountNumber);
      return Promise.resolve(mockFetchJson({ status: true, data: { account_name: "TEST HOST", account_number: account.accountNumber } }));
    }
    if (url.pathname === "/subaccount") {
      expect(init?.body).toBe(JSON.stringify({ business_name: "Test Events", bank_code: "058", account_number: account.accountNumber, percentage_charge: 5 }));
      return Promise.resolve(mockFetchJson({
        status: true, data: { id: 128, subaccount_code: "ACCT_testhost", account_number: account.accountNumber, currency: "NGN", active: true },
      }));
    }
    if (url.pathname === "/settlement") {
      expect(url.searchParams.get("subaccount")).toBe("128");
      return Promise.resolve(mockFetchJson({
        status: true, data: [{ status: "success", effective_amount: 200_000, currency: "NGN", settlement_date: "2027-06-14T00:00:00.000Z" }],
      }));
    }
    if (url.pathname === "/transaction/initialize") {
      const body = init?.body;
      if (typeof body !== "string") throw new Error("Expected Checkout API JSON body");
      const split = JSON.parse(body) as { callback_url: string };
      expect(split).toMatchObject({
        amount: 246_912, transaction_charge: 12_345, subaccount: "ACCT_testhost", currency: "NGN", bearer: "account",
      });
      expect(split.callback_url).toMatch(`/tickets/${eventId}/success?orderId=`);
      return Promise.resolve(mockFetchJson({ status: true, data: { authorization_url: "https://checkout.paystack.com/mock" } }));
    }
    if (url.pathname.startsWith("/transaction/verify/")) {
      return Promise.resolve(mockFetchJson({
        status: true, data: { status: "success", amount: 246_912, paid_at: new Date().toISOString(), currency: "NGN" },
      }));
    }
    throw new Error("Unexpected Paystack endpoint");
  });

  const verification = await request(app).post(`${payout}/resolve`).set("Authorization", hostAuth).send(account);
  expect(verification.body).toMatchObject({ data: { accountName: "TEST HOST" } });
  const setup = { ...account, businessName: "Test Events", accountName: "TEST HOST", password };
  const wrongPassword = await request(app).post(payout).set("Authorization", hostAuth).send({ ...setup, password: "wrong" });
  expect(wrongPassword.status).toBe(403);
  const configured = await request(app).post(payout).set("Authorization", hostAuth).send(setup);
  expect(configured.status).toBe(201);
  expect(configured.body).toMatchObject({ data: { accountName: "TEST HOST", accountLast4: "6047" } });
  expect(configured.text).not.toContain(account.accountNumber);
  expect(configured.text).not.toContain("ACCT_");
  expect((await request(app).post(payout).set("Authorization", hostAuth).send(setup)).status).toBe(409);
  expect((await request(app).post(publish).set("Authorization", hostAuth)).status).toBe(200);
  expect((await request(app).get(`/api/v1/events/${eventId}`)).status).toBe(200);

  const checkout = await request(app).post("/api/v1/orders/checkout").set("Authorization", buyerAuth)
    .send({ ...checkoutBody, subaccount: "ACCT_wrong", amount: 1, platformFeeKobo: 0 });
  expect(checkout.status).toBe(201);
  const [order] = await getDb().select().from(orders).where(eq(orders.eventId, eventId));
  expect(order).toMatchObject({ paystackSubaccount: "ACCT_testhost", platformFeeKobo: 12_345 });
  const orderResponse = await request(app).get(`/api/v1/orders/${order!.id}`).set("Authorization", buyerAuth);
  expect(orderResponse.text).not.toContain("ACCT_");
  expect((await deliverCharge(order!.paystackReference)).status).toBe(200);
  await vi.waitFor(() => expect(memoryEmail.messages).toHaveLength(1));
  expect((await request(app).get(`/api/v1/events/organizer/${eventId}`).set("Authorization", hostAuth)).body)
    .toMatchObject({ data: { sales: { grossKobo: 246_912, platformFeeKobo: 12_345 } } });
  expect((await request(app).get(`${payout}/settlements`).set("Authorization", hostAuth)).body)
    .toMatchObject({ data: [{ status: "success", amountKobo: 200_000 }] });
  expect(paystack).toHaveBeenCalledTimes(6);
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
        isPublished: true,
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

  it("handles simultaneous deliveries once without consuming another order's reservation", async () => {
    const fixture = await setupPendingOrderFixture({ quantity: 2 });
    await createOrderWithReservation({
      buyerId: fixture.user.id, eventId: fixture.event.id,
      items: [{ tierId: fixture.tier.id, quantity: 2 }],
      paystackReference: `${fixture.ref}-second`, reservationExpiresAt: fixture.order.reservationExpiresAt,
    });
    let received = 0;
    let allowVerify!: () => void;
    const verifyBarrier = new Promise<void>((resolve) => { allowVerify = resolve; });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      if (++received === 2) allowVerify();
      await verifyBarrier;
      return confirmedPayment(fixture.totalKobo);
    });

    const responses = await Promise.all([deliverCharge(fixture.ref), deliverCharge(fixture.ref)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const [order] = await getDb().select().from(orders).where(eq(orders.id, fixture.order.id));
    expect(order?.status).toBe("paid");
    expect(await getDb().select().from(tickets).where(eq(tickets.orderId, fixture.order.id))).toHaveLength(2);
    const [tier] = await getDb().select().from(ticketTiers).where(eq(ticketTiers.id, fixture.tier.id));
    expect(tier).toMatchObject({ quantityReserved: 2, quantitySold: 2 });
    await vi.waitFor(() => expect(memoryEmail.messages).toHaveLength(1));
  });

  it("returns a retryable response when fulfillment rolls back and commits on retry", async () => {
    const fixture = await setupPendingOrderFixture();
    const verifiedAt = new Date(Date.now() - 120_000);
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(confirmedPayment(fixture.totalKobo, verifiedAt)));
    await getDb().execute(sql`CREATE FUNCTION interrupt_ticket_insert() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test interruption'; END; $$`);
    try {
      await getDb().execute(sql`CREATE TRIGGER interrupt_ticket_insert BEFORE INSERT ON tickets
        FOR EACH ROW EXECUTE FUNCTION interrupt_ticket_insert()`);
      expect((await deliverCharge(fixture.ref)).status).toBe(503);
      const [order] = await getDb().select().from(orders).where(eq(orders.id, fixture.order.id));
      const [tier] = await getDb().select().from(ticketTiers).where(eq(ticketTiers.id, fixture.tier.id));
      expect(order?.status).toBe("pending");
      expect(tier).toMatchObject({ quantityReserved: 2, quantitySold: 0 });
      expect(await getDb().select().from(tickets)).toHaveLength(0);
    } finally {
      await getDb().execute(sql`DROP TRIGGER IF EXISTS interrupt_ticket_insert ON tickets`);
      await getDb().execute(sql`DROP FUNCTION interrupt_ticket_insert()`);
    }

    await getDb().update(orders).set({ reservationExpiresAt: new Date(Date.now() - 60_000) })
      .where(eq(orders.id, fixture.order.id));
    expect((await deliverCharge(fixture.ref)).status).toBe(200);
    expect(await getDb().select().from(tickets)).toHaveLength(2);
    await vi.waitFor(() => expect(memoryEmail.messages).toHaveLength(1));
  });

  it("returns 503 when Paystack verification is unavailable and accepts a later retry", async () => {
    const fixture = await setupPendingOrderFixture();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Provider offline"))
      .mockResolvedValueOnce(confirmedPayment(fixture.totalKobo));
    expect((await deliverCharge(fixture.ref)).status).toBe(503);
    expect((await deliverCharge(fixture.ref)).status).toBe(200);
    expect(await getDb().select().from(tickets)).toHaveLength(2);
    await vi.waitFor(() => expect(memoryEmail.messages).toHaveLength(1));
  });

  it("fulfills order, transitions reserved inventory to sold, and generates tickets", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 2 });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo, paid_at: new Date().toISOString() },
      })
    );

    await processChargeSuccess(fixture.ref);

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

    // Ticket email must be dispatched to the buyer after successful fulfillment
    expect(memoryEmail.messages).toHaveLength(1);
    const emailSent = memoryEmail.messages[0]!;
    expect(emailSent.to).toBe(fixture.user.email);
    expect(emailSent.subject).toContain(fixture.event.title);
    expect(emailSent.text).toContain(createdTickets[0]!.code);
  });

  it("sends a ticket email for each ticket code after fulfillment", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 3 });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo, paid_at: new Date().toISOString() },
      })
    );

    await processChargeSuccess(fixture.ref);

    expect(memoryEmail.messages).toHaveLength(1);
    const msg = memoryEmail.messages[0]!;
    // All 3 ticket codes must appear in the email body
    const createdTickets = await getDb()
      .select()
      .from(tickets)
      .where(eq(tickets.orderId, fixture.order.id));
    for (const t of createdTickets) {
      expect(msg.text).toContain(t.code);
    }
  });

  it("does not send any notification when payment verification fails (amount mismatch)", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 2 });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: 100, paid_at: new Date().toISOString() },
      })
    );

    await processChargeSuccess(fixture.ref);

    expect(memoryEmail.messages).toHaveLength(0);
    expect(memoryWhatsApp.messages).toHaveLength(0);
  });

  it("is idempotent on duplicate webhook delivery", async () => {
    const fixture = await setupPendingOrderFixture({ price: 500000, quantity: 1 });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo, paid_at: new Date().toISOString() },
      })
    );

    await processChargeSuccess(fixture.ref);
    // Duplicate webhook call
    await processChargeSuccess(fixture.ref);

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
        data: { status: "success", amount: 100, paid_at: new Date().toISOString() }, // paid only 100 kobo instead of totalKobo
      })
    );

    await processChargeSuccess(fixture.ref);

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

    // No notifications should be sent when payment is rejected
    expect(memoryEmail.messages).toHaveLength(0);
  });

  it("marks order as payment_exception if Paystack received payment after reservation expiry", async () => {
    const fixture = await setupPendingOrderFixture({
      price: 500000,
      quantity: 2,
      expired: true,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { status: "success", amount: fixture.totalKobo, paid_at: new Date().toISOString() },
      })
    );

    await processChargeSuccess(fixture.ref);

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

    // No notifications should be sent when reservation has expired
    expect(memoryEmail.messages).toHaveLength(0);
  });
});
