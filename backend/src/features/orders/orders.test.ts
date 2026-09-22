import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createAccessToken } from "#shared/utils/tokens.js";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import { users } from "#features/auth/auth.schema.js";
import { events, ticketTiers } from "#features/events/events.schema.js";
import { orders, orderItems, tickets } from "./orders.schema.js";

const app = createApp();

type ResponseBody = {
  data?: {
    accessToken?: string;
    orderId?: string;
    authorizationUrl?: string;
    reference?: string;
    id?: string;
    status?: string;
    totalKobo?: number;
    processed?: number;
    event?: { id: string };
    tiers?: Array<{ id: string }>;
  };
  message?: string;
};

function body(response: { body: unknown }): ResponseBody {
  return response.body as ResponseBody;
}

function mockFetchJson(data: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function mockFetchError(status: number, text: string): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

async function registerVerifiedUser(
  email: string,
  isOrganizer = false
): Promise<{ token: string; userId: string }> {
  const normalizedEmail = email.toLowerCase();
  const response = await request(app).post("/api/v1/auth/register").send({
    email: normalizedEmail,
    password: "correct horse battery staple",
  });
  if (response.status !== 201) {
    throw new Error(`Registration failed for ${normalizedEmail} (status ${response.status})`);
  }

  const [user] = await getDb()
    .update(users)
    .set({ isEmailVerified: true, isOrganizer })
    .where(eq(users.email, normalizedEmail))
    .returning();

  if (!user) {
    throw new Error(`User not found after update for ${normalizedEmail}`);
  }

  const token = createAccessToken({
    userId: user.id,
    email: user.email,
    isEmailVerified: true,
    isOrganizer,
  });

  return { token, userId: user.id };
}

async function createEventFixture(
  organizerToken: string,
  quantityAvailable = 10
): Promise<{ eventId: string; tierId: string }> {
  const res = await request(app)
    .post("/api/v1/events")
    .set("Authorization", `Bearer ${organizerToken}`)
    .send({
      title: "Concert Night",
      description: "Music concert",
      venue: "Main Stage",
      startsAt: "2026-12-31T20:00:00+00:00",
      tiers: [{ name: "Standard", price: 500000, quantityAvailable }],
    });

  const parsed = body(res);
  const eventId = parsed.data?.event?.id;
  const tierId = parsed.data?.tiers?.[0]?.id;
  if (!eventId || !tierId) {
    throw new Error("Failed to create event fixture");
  }
  return { eventId, tierId };
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

describe("POST /api/v1/orders/checkout", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .send({
        eventId: "00000000-0000-0000-0000-000000000000",
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
      });

    expect(res.status).toBe(401);
  });

  it("rejects untrusted callbackUrl", async () => {
    const buyer = await registerVerifiedUser("buyer-url@example.com");

    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId: "00000000-0000-0000-0000-000000000000",
        callbackUrl: "https://attacker.example.com/callback",
        items: [{ tierId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
      });

    expect(res.status).toBe(422);
  });

  it("rejects unverified user checkout", async () => {
    const resAuth = await request(app).post("/api/v1/auth/register").send({
      email: "unverified-buyer@example.com",
      password: "correct horse battery staple",
    });
    const token = body(resAuth).data?.accessToken;

    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${token ?? ""}`)
      .send({
        eventId: "00000000-0000-0000-0000-000000000000",
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
      });

    expect(res.status).toBe(403);
  });

  it("successfully reserves inventory and initializes Paystack", async () => {
    const org = await registerVerifiedUser("org1@example.com", true);
    const buyer = await registerVerifiedUser("buyer1@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 10);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/mock-auth" },
      })
    );

    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId,
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId, quantity: 2 }],
      });

    expect(res.status).toBe(201);
    const resData = body(res).data;
    expect(typeof resData?.orderId).toBe("string");
    expect(resData?.authorizationUrl).toBe("https://checkout.paystack.com/mock-auth");
    expect(resData?.reference?.startsWith("TKT-")).toBe(true);

    const [tier] = await getDb().select().from(ticketTiers).where(eq(ticketTiers.id, tierId));
    expect(tier?.quantityReserved).toBe(2);
    expect(tier?.quantitySold).toBe(0);
  });

  it("rejects checkout when requested quantity exceeds available stock", async () => {
    const org = await registerVerifiedUser("org2@example.com", true);
    const buyer = await registerVerifiedUser("buyer2@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 2);

    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId,
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId, quantity: 3 }],
      });

    expect(res.status).toBe(409);
  });

  it("prevents overselling during concurrent checkout requests", async () => {
    const org = await registerVerifiedUser("org3@example.com", true);
    const buyerA = await registerVerifiedUser("buyerA@example.com");
    const buyerB = await registerVerifiedUser("buyerB@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 2);

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchJson({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/mock-auth" },
      })
    );

    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/v1/orders/checkout")
        .set("Authorization", `Bearer ${buyerA.token}`)
        .send({
          eventId,
          callbackUrl: "http://localhost:5173/callback",
          items: [{ tierId, quantity: 2 }],
        }),
      request(app)
        .post("/api/v1/orders/checkout")
        .set("Authorization", `Bearer ${buyerB.token}`)
        .send({
          eventId,
          callbackUrl: "http://localhost:5173/callback",
          items: [{ tierId, quantity: 2 }],
        }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const [tier] = await getDb().select().from(ticketTiers).where(eq(ticketTiers.id, tierId));
    expect(tier?.quantityReserved).toBe(2);
  });

  it("releases inventory and marks order failed if Paystack initialize fails", async () => {
    const org = await registerVerifiedUser("org4@example.com", true);
    const buyer = await registerVerifiedUser("buyer4@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 5);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchError(500, "Internal Server Error")
    );

    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId,
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId, quantity: 2 }],
      });

    expect(res.status).toBe(502);

    const [tier] = await getDb().select().from(ticketTiers).where(eq(ticketTiers.id, tierId));
    expect(tier?.quantityReserved).toBe(0);

    const [order] = await getDb().select().from(orders);
    expect(order?.status).toBe("failed");
  });
});

describe("GET /api/v1/orders/:orderId", () => {
  it("allows buyer to retrieve their own order", async () => {
    const org = await registerVerifiedUser("org5@example.com", true);
    const buyer = await registerVerifiedUser("buyer5@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 5);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/mock-auth" },
      })
    );

    const checkoutRes = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId,
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId, quantity: 1 }],
      });

    const orderId = body(checkoutRes).data?.orderId;
    if (!orderId) {
      throw new Error("Missing orderId from checkout response");
    }

    const res = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(body(res).data).toMatchObject({
      id: orderId,
      status: "pending",
    });
  });

  it("returns 404 when querying an order owned by another user", async () => {
    const org = await registerVerifiedUser("org6@example.com", true);
    const buyer = await registerVerifiedUser("buyer6@example.com");
    const otherBuyer = await registerVerifiedUser("otherbuyer@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 5);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/mock-auth" },
      })
    );

    const checkoutRes = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId,
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId, quantity: 1 }],
      });

    const orderId = body(checkoutRes).data?.orderId;
    if (!orderId) {
      throw new Error("Missing orderId from checkout response");
    }

    const res = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${otherBuyer.token}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/orders/admin/cleanup-expired", () => {
  it("rejects non-organizer requests", async () => {
    const buyer = await registerVerifiedUser("regular@example.com", false);

    const res = await request(app)
      .post("/api/v1/orders/admin/cleanup-expired")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(403);
  });

  it("releases expired reservations and marks order expired", async () => {
    const org = await registerVerifiedUser("org-clean@example.com", true);
    const buyer = await registerVerifiedUser("buyer-clean@example.com");
    const { eventId, tierId } = await createEventFixture(org.token, 5);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockFetchJson({
        status: true,
        data: { authorization_url: "https://checkout.paystack.com/mock-auth" },
      })
    );

    const checkoutRes = await request(app)
      .post("/api/v1/orders/checkout")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        eventId,
        callbackUrl: "http://localhost:5173/callback",
        items: [{ tierId, quantity: 2 }],
      });

    const orderId = body(checkoutRes).data?.orderId;
    if (!orderId) {
      throw new Error("Missing orderId from checkout response");
    }

    // Artificially expire the order reservation time in DB
    await getDb()
      .update(orders)
      .set({ reservationExpiresAt: new Date(Date.now() - 60000) })
      .where(eq(orders.id, orderId));

    const cleanupRes = await request(app)
      .post("/api/v1/orders/admin/cleanup-expired")
      .set("Authorization", `Bearer ${org.token}`);

    expect(cleanupRes.status).toBe(200);
    expect(body(cleanupRes).data?.processed).toBe(1);

    const [updatedOrder] = await getDb().select().from(orders).where(eq(orders.id, orderId));
    expect(updatedOrder?.status).toBe("expired");

    const [updatedTier] = await getDb()
      .select()
      .from(ticketTiers)
      .where(eq(ticketTiers.id, tierId));
    expect(updatedTier?.quantityReserved).toBe(0);
  });
});
