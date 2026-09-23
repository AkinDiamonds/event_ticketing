import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createAccessToken } from "#shared/utils/tokens.js";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import { users } from "#features/auth/auth.schema.js";
import { events, ticketTiers } from "#features/events/events.schema.js";
import { orders, orderItems, tickets } from "#features/orders/orders.schema.js";

const app = createApp();

type ResponseBody = {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: {
    code?: string;
    tierName?: string;
    checkedInAt?: string;
  };
  errors?: Array<{
    code?: string;
    checked_in_at?: string;
    message?: string;
    path?: string[];
  }>;
};

function body(response: { body: unknown }): ResponseBody {
  return response.body as ResponseBody;
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
  tierName = "VIP"
): Promise<{ eventId: string; tierId: string }> {
  const res = await request(app)
    .post("/api/v1/events")
    .set("Authorization", `Bearer ${organizerToken}`)
    .send({
      title: "Festive Night",
      description: "Music & dance festival",
      venue: "Main Arena",
      startsAt: "2026-12-31T20:00:00+00:00",
      tiers: [{ name: tierName, price: 500000, quantityAvailable: 50 }],
    });

  const parsed = body(res) as { data?: { event?: { id: string }; tiers?: Array<{ id: string }> } };
  const eventId = parsed.data?.event?.id;
  const tierId = parsed.data?.tiers?.[0]?.id;
  if (!eventId || !tierId) {
    throw new Error("Failed to create event fixture");
  }
  return { eventId, tierId };
}

async function createPaidTicketFixture(
  buyerId: string,
  eventId: string,
  tierId: string,
  code: string,
  status: "valid" | "used" = "valid",
  checkedInAt: Date | null = null,
  orderStatus: "pending" | "paid" | "expired" | "failed" | "payment_exception" = "paid",
  orderDeletedAt: Date | null = null
): Promise<{ ticketId: string; orderId: string }> {
  const db = getDb();

  const [order] = await db
    .insert(orders)
    .values({
      buyerId,
      eventId,
      totalKobo: 500000,
      status: orderStatus,
      paystackReference: `REF-${code}-${Date.now()}-${Math.random()}`,
      reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      deletedAt: orderDeletedAt,
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: order!.id,
    ticketTierId: tierId,
    quantity: 1,
    unitPriceKobo: 500000,
  });

  const [ticket] = await db
    .insert(tickets)
    .values({
      orderId: order!.id,
      ticketTierId: tierId,
      code,
      status,
      checkedInAt,
    })
    .returning();

  return { ticketId: ticket!.id, orderId: order!.id };
}

beforeEach(async () => {
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

describe("POST /api/v1/events/:eventId/check-in", () => {
  describe("Authentication & Authorization", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .post("/api/v1/events/00000000-0000-0000-0000-000000000000/check-in")
        .send({ code: "ABC234" });

      expect(res.status).toBe(401);
      expect(body(res).success).toBe(false);
    });

    it("rejects non-organizer requests with 403", async () => {
      const attendee = await registerVerifiedUser("attendee@example.com", false);

      const res = await request(app)
        .post("/api/v1/events/00000000-0000-0000-0000-000000000000/check-in")
        .set("Authorization", `Bearer ${attendee.token}`)
        .send({ code: "ABC234" });

      expect(res.status).toBe(403);
      expect(body(res).success).toBe(false);
    });
  });

  describe("Input Validation", () => {
    it("rejects invalid eventId format with 422", async () => {
      const organizer = await registerVerifiedUser("org-val@example.com", true);

      const res = await request(app)
        .post("/api/v1/events/not-a-uuid/check-in")
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: "ABC234" });

      expect(res.status).toBe(422);
      expect(body(res).success).toBe(false);
    });

    it("rejects invalid code format (wrong length) with 422", async () => {
      const organizer = await registerVerifiedUser("org-val2@example.com", true);
      const { eventId } = await createEventFixture(organizer.token);

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: "ABC" });

      expect(res.status).toBe(422);
      expect(body(res).success).toBe(false);
    });

    it("rejects invalid characters (ambiguous characters like 0, 1, O, I) with 422", async () => {
      const organizer = await registerVerifiedUser("org-val3@example.com", true);
      const { eventId } = await createEventFixture(organizer.token);

      // '1' and 'O' are not in ALPHABET ("ABCDEFGHJKMNPQRSTUVWXYZ23456789")
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: "ABC1O9" });

      expect(res.status).toBe(422);
      expect(body(res).success).toBe(false);
    });
  });

  describe("Check-in Success Path", () => {
    it("successfully checks in a valid ticket and returns 200 with flat payload", async () => {
      const organizer = await registerVerifiedUser("org-success@example.com", true);
      const buyer = await registerVerifiedUser("buyer-success@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token, "VIP Lounge");

      const ticketCode = "XKQR7T";
      await createPaidTicketFixture(buyer.userId, eventId, tierId, ticketCode);

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: ticketCode });

      expect(res.status).toBe(200);
      const resBody = body(res);
      expect(resBody.success).toBe(true);
      expect(resBody.data).toBeDefined();
      expect(resBody.data?.code).toBe(ticketCode);
      expect(resBody.data?.tierName).toBe("VIP Lounge");
      expect(resBody.data?.checkedInAt).toBeDefined();

      // Verify DB state
      const [ticketInDb] = await getDb()
        .select()
        .from(tickets)
        .where(eq(tickets.code, ticketCode));

      expect(ticketInDb?.status).toBe("used");
      expect(ticketInDb?.checkedInAt).not.toBeNull();
    });

    it("coerces lowercase code input to uppercase and checks in successfully", async () => {
      const organizer = await registerVerifiedUser("org-lower@example.com", true);
      const buyer = await registerVerifiedUser("buyer-lower@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token, "General Admission");

      const ticketCode = "M4PB2W";
      await createPaidTicketFixture(buyer.userId, eventId, tierId, ticketCode);

      // Send lowercase input "m4pb2w"
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: "m4pb2w" });

      expect(res.status).toBe(200);
      const resBody = body(res);
      expect(resBody.success).toBe(true);
      expect(resBody.data?.code).toBe(ticketCode);
      expect(resBody.data?.tierName).toBe("General Admission");
    });
  });

  describe("Duplicate Check-in (409 Conflict)", () => {
    it("returns 409 with prior check-in timestamp when code was already redeemed", async () => {
      const organizer = await registerVerifiedUser("org-dup@example.com", true);
      const buyer = await registerVerifiedUser("buyer-dup@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token);

      const ticketCode = "234567";
      const priorCheckIn = new Date("2026-09-20T14:30:00Z");
      await createPaidTicketFixture(
        buyer.userId,
        eventId,
        tierId,
        ticketCode,
        "used",
        priorCheckIn
      );

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: ticketCode });

      expect(res.status).toBe(409);
      const resBody = body(res);
      expect(resBody.success).toBe(false);
      expect(resBody.message).toContain("already checked in");
      expect(resBody.errors).toBeDefined();
      expect(Array.isArray(resBody.errors)).toBe(true);
      expect(resBody.errors?.[0]?.code).toBe("TICKET_USED");
      expect(resBody.errors?.[0]?.checked_in_at).toBe(priorCheckIn.toISOString());
    });
  });

  describe("Not Found / Scope Isolation (404 Not Found)", () => {
    it("returns 404 when code does not exist", async () => {
      const organizer = await registerVerifiedUser("org-notfound@example.com", true);
      const { eventId } = await createEventFixture(organizer.token);

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: "999999" });

      expect(res.status).toBe(404);
      expect(body(res).success).toBe(false);
    });

    it("returns 404 (not 403) when code belongs to another organizer's event", async () => {
      const organizerA = await registerVerifiedUser("org-a@example.com", true);
      const organizerB = await registerVerifiedUser("org-b@example.com", true);
      const buyer = await registerVerifiedUser("buyer-other@example.com", false);

      const eventA = await createEventFixture(organizerA.token);
      const eventB = await createEventFixture(organizerB.token);

      const ticketCodeA = "AAA222";
      await createPaidTicketFixture(buyer.userId, eventA.eventId, eventA.tierId, ticketCodeA);

      // Organizer B tries to check in Organizer A's ticket code
      const res = await request(app)
        .post(`/api/v1/events/${eventB.eventId}/check-in`)
        .set("Authorization", `Bearer ${organizerB.token}`)
        .send({ code: ticketCodeA });

      // Must return 404 to avoid leaking existence of ticket across organizers
      expect(res.status).toBe(404);
      expect(body(res).success).toBe(false);
    });

    it("returns 404 when code belongs to a different event of the same organizer", async () => {
      const organizer = await registerVerifiedUser("org-multievent@example.com", true);
      const buyer = await registerVerifiedUser("buyer-multi@example.com", false);

      const event1 = await createEventFixture(organizer.token);
      const event2 = await createEventFixture(organizer.token);

      const ticketCode1 = "BBB333";
      await createPaidTicketFixture(buyer.userId, event1.eventId, event1.tierId, ticketCode1);

      // Organizer scans event1's ticket under event2
      const res = await request(app)
        .post(`/api/v1/events/${event2.eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: ticketCode1 });

      expect(res.status).toBe(404);
      expect(body(res).success).toBe(false);
    });

    it("returns 404 when ticket belongs to an order that is not paid (e.g. pending/expired/failed)", async () => {
      const organizer = await registerVerifiedUser("org-unpaid@example.com", true);
      const buyer = await registerVerifiedUser("buyer-unpaid@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token);

      const ticketCode = "UNP234";
      await createPaidTicketFixture(
        buyer.userId,
        eventId,
        tierId,
        ticketCode,
        "valid",
        null,
        "pending"
      );

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: ticketCode });

      expect(res.status).toBe(404);
      expect(body(res).success).toBe(false);
    });

    it("returns 404 when ticket belongs to a soft-deleted order", async () => {
      const organizer = await registerVerifiedUser("org-delorder@example.com", true);
      const buyer = await registerVerifiedUser("buyer-delorder@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token);

      const ticketCode = "DEC234";
      await createPaidTicketFixture(
        buyer.userId,
        eventId,
        tierId,
        ticketCode,
        "valid",
        null,
        "paid",
        new Date()
      );

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/check-in`)
        .set("Authorization", `Bearer ${organizer.token}`)
        .send({ code: ticketCode });

      expect(res.status).toBe(404);
      expect(body(res).success).toBe(false);
    });
  });

  describe("Concurrency & Scale Tests", () => {
    it("handles simultaneous duplicate scans atomically (exactly one 200, one 409)", async () => {
      const organizer = await registerVerifiedUser("org-concurrent@example.com", true);
      const buyer = await registerVerifiedUser("buyer-concurrent@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token, "VIP");

      const ticketCode = "CCC444";
      await createPaidTicketFixture(buyer.userId, eventId, tierId, ticketCode);

      // Fire 2 simultaneous check-in requests for the same ticket code
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/events/${eventId}/check-in`)
          .set("Authorization", `Bearer ${organizer.token}`)
          .send({ code: ticketCode }),
        request(app)
          .post(`/api/v1/events/${eventId}/check-in`)
          .set("Authorization", `Bearer ${organizer.token}`)
          .send({ code: ticketCode }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const successRes = res1.status === 200 ? res1 : res2;
      const conflictRes = res1.status === 409 ? res1 : res2;

      expect(body(successRes).data?.code).toBe(ticketCode);
      expect(body(conflictRes).errors?.[0]?.code).toBe("TICKET_USED");
      expect(body(conflictRes).errors?.[0]?.checked_in_at).toBeDefined();
    });

    it("allows multiple staff to scan different tickets concurrently without contention", async () => {
      const organizer = await registerVerifiedUser("org-parallel@example.com", true);
      const buyer = await registerVerifiedUser("buyer-parallel@example.com", false);
      const { eventId, tierId } = await createEventFixture(organizer.token, "General");

      const code1 = "DDD555";
      const code2 = "EEE666";
      const code3 = "FFF777";

      await createPaidTicketFixture(buyer.userId, eventId, tierId, code1);
      await createPaidTicketFixture(buyer.userId, eventId, tierId, code2);
      await createPaidTicketFixture(buyer.userId, eventId, tierId, code3);

      const [res1, res2, res3] = await Promise.all([
        request(app)
          .post(`/api/v1/events/${eventId}/check-in`)
          .set("Authorization", `Bearer ${organizer.token}`)
          .send({ code: code1 }),
        request(app)
          .post(`/api/v1/events/${eventId}/check-in`)
          .set("Authorization", `Bearer ${organizer.token}`)
          .send({ code: code2 }),
        request(app)
          .post(`/api/v1/events/${eventId}/check-in`)
          .set("Authorization", `Bearer ${organizer.token}`)
          .send({ code: code3 }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      expect(body(res1).data?.code).toBe(code1);
      expect(body(res2).data?.code).toBe(code2);
      expect(body(res3).data?.code).toBe(code3);
    });
  });
});
