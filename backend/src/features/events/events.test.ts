import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import { createAccessToken } from "#shared/utils/tokens.js";
import {
  emailVerificationTokens,
  passwordResetTokens,
  refreshTokens,
  users,
} from "#features/auth/auth.schema.js";
import { events, ticketTiers } from "./events.schema.js";
import { orders, orderItems, tickets } from "#features/orders/orders.schema.js";
import { organizerPayouts } from "#db/schema.js";

const app = createApp();

type ResponseBody = {
  data?: Record<string, unknown> & {
    accessToken?: string;
    event?: { id: string; title?: string; venue?: string; startsAt?: string };
    tiers?: Array<{ id: string; name?: string; price?: number; quantityAvailable?: number }>;
    items?: Array<{ id: string }>;
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    id?: string;
    name?: string;
    price?: number;
    quantityAvailable?: number;
  };
  message?: string;
};

function body(response: { body: unknown }): ResponseBody {
  return response.body as ResponseBody;
}

/**
 * Registers a new user, marks their email as verified, and returns their
 * access token. Use this helper any time a test needs an authenticated,
 * verified organizer candidate.
 */
async function registerVerifiedUser(email: string, approved = false): Promise<string> {
  const response = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "correct horse battery staple",
  });
  expect(response.status).toBe(201);
  await getDb().update(users)
    .set({ isEmailVerified: true, organizerApprovedAt: approved ? new Date() : null })
    .where(eq(users.email, email));
  const login = await request(app).post("/api/v1/auth/login").send({
    email, password: "correct horse battery staple",
  });
  const accessToken = body(login).data?.accessToken;
  if (!accessToken) {
    throw new Error(`Login did not return an access token (status ${login.status})`);
  }

  return accessToken;
}

/**
 * Registers a verified organizer, creates a single event, and returns both
 * the access token and the created event/tier IDs. Use this as a shared
 * fixture for tests that need an existing event to operate on.
 *
 * Each call uses the provided unique email so tests never conflict with each
 * other even if the beforeEach cleanup is slower than expected.
 */
async function createEventAsOrganizer(email: string): Promise<{
  accessToken: string;
  eventId: string;
  tierId: string;
}> {
  const accessToken = await registerVerifiedUser(email, true);
  const response = await request(app)
    .post("/api/v1/events")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      title: "Campus Night",
      description: "A student party event",
      venue: "LASU Main Auditorium",
      startsAt: "2026-12-31T20:00:00+00:00",
      tiers: [{ name: "Regular", price: 500000, quantityAvailable: 100 }],
    });

  const eventId = body(response).data?.event?.id;
  const tierId = body(response).data?.tiers?.[0]?.id;
  if (!eventId || !tierId) {
    throw new Error(`Event creation did not return expected IDs (status ${response.status})`);
  }
  const [event] = await getDb().update(events).set({ isPublished: true }).where(eq(events.id, eventId)).returning();
  await getDb().insert(organizerPayouts).values({
    organizerId: event!.organizerId, subaccountCode: `ACCT_${eventId}`, subaccountId: eventId.slice(0, 32),
    accountName: "Test Organizer", bankCode: "058", accountLast4: "6047",
  });

  return { accessToken, eventId, tierId };
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

beforeEach(async () => {
  await getDb().delete(tickets);
  await getDb().delete(orderItems);
  await getDb().delete(orders);
  await getDb().delete(ticketTiers);
  await getDb().delete(events);
  await getDb().delete(emailVerificationTokens);
  await getDb().delete(passwordResetTokens);
  await getDb().delete(refreshTokens);
  await getDb().delete(users);
});

afterAll(async () => {
  await closeDb();
});

// ── Public event endpoints ────────────────────────────────────────────────────

describe("public event endpoints", () => {
  it("returns an empty active event list", async () => {
    const response = await request(app).get("/api/v1/events");

    expect(response.status).toBe(200);
    expect(body(response).data).toMatchObject({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it("rejects an invalid event id", async () => {
    const response = await request(app).get("/api/v1/events/not-a-uuid");

    expect(response.status).toBe(422);
  });

  it("returns 404 for a valid but non-existent event id", async () => {
    const response = await request(app).get(
      "/api/v1/events/00000000-0000-0000-0000-000000000000"
    );

    expect(response.status).toBe(404);
  });

  it("returns event details and tiers for a valid event", async () => {
    const { eventId } = await createEventAsOrganizer("organizer-get@example.com");

    const response = await request(app).get(`/api/v1/events/${eventId}`);

    expect(response.status).toBe(200);
    expect(body(response).data?.event).toMatchObject({
      id: eventId,
      title: "Campus Night",
      venue: "LASU Main Auditorium",
    });
    expect(body(response).data?.tiers).toHaveLength(1);
    expect(body(response).data?.tiers?.[0]).toMatchObject({
      name: "Regular",
      price: 500000,
      quantityAvailable: 100,
    });
  });

  it("lists only active (non-deleted) events", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-list@example.com"
    );

    // Soft-delete the event
    await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    const response = await request(app).get("/api/v1/events");

    expect(response.status).toBe(200);
    expect(body(response).data?.items).toHaveLength(0);
    expect(body(response).data?.pagination?.total).toBe(0);
  });
});

// ── Event creation and ownership ──────────────────────────────────────────────

describe("event creation and ownership", () => {
  it("lists only owned events and honors revocation with the original access token", async () => {
    const email = "approved-owner@example.com";
    const owner = await createEventAsOrganizer(email);
    const other = await createEventAsOrganizer("approved-other@example.com");
    const attendee = await registerVerifiedUser("event-viewer@example.com");
    const path = "/api/v1/events/organizer";
    const auth = `Bearer ${owner.accessToken}`;
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    const approvedAccount = await request(app).get("/api/v1/auth/me").set("Authorization", auth);
    expect(body(approvedAccount).data?.["isOrganizer"]).toBe(true);
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set("Authorization", `Bearer ${attendee}`)).status).toBe(403);
    const list = await request(app).get(path).set("Authorization", auth);
    expect(body(list).data?.items?.map((event) => event.id)).toEqual([owner.eventId]);
    expect((await request(app).get(`${path}/${other.eventId}`).set("Authorization", auth)).status).toBe(404);
    expect((await request(app).get(`${path}/${owner.eventId}`).set("Authorization", auth)).status).toBe(200);
    expect((await request(app).get(`${path}/invalid-id`).set("Authorization", auth)).status).toBe(422);
    expect((await request(app).get(`${path}?page=0`).set("Authorization", auth)).status).toBe(422);

    await getDb().update(users).set({ organizerSuspendedAt: new Date() }).where(eq(users.email, email));
    const currentAccount = await request(app).get("/api/v1/auth/me").set("Authorization", auth);
    expect(body(currentAccount).data?.["isOrganizer"]).toBe(false);
    expect((await request(app).get(path).set("Authorization", auth)).status).toBe(403);
    const update = await request(app).patch(`/api/v1/events/${owner.eventId}`)
      .set("Authorization", auth).send({ title: "After revocation" });
    expect(update.status).toBe(403);
  });

  it("keeps a paused tier private until an organizer enables sales", async () => {
    const owner = await createEventAsOrganizer("paused-owner@example.com");
    const auth = `Bearer ${owner.accessToken}`;
    const path = `/api/v1/events/${owner.eventId}`;
    const added = await request(app).post(`${path}/tiers`).set("Authorization", auth)
      .send({ name: "Balcony", price: 800000, quantityAvailable: 12, isActive: false });
    expect(added.status).toBe(201);
    const tierId = body(added).data?.id;
    const before = await request(app).get(path);
    expect(body(before).data?.tiers?.map((tier) => tier.id)).toEqual([owner.tierId]);

    const enabled = await request(app).patch(`${path}/tiers/${tierId}`).set("Authorization", auth)
      .send({ name: "Premium Balcony", isActive: true });
    expect(enabled.status).toBe(200);
    const after = await request(app).get(path);
    expect(body(after).data?.tiers).toContainEqual(expect.objectContaining({ name: "Premium Balcony" }));
  });

  it("requires authentication and prevents a suspended organizer from opening a new workspace", async () => {
    const input = {
      title: "Campus Night",
      description: "A student party event",
      venue: "LASU Main Auditorium",
      startsAt: "2026-12-31T20:00:00+00:00",
      tiers: [{ name: "Regular", price: 500000, quantityAvailable: 100 }],
    };

    const unauthenticated = await request(app).post("/api/v1/events").send(input);
    const email = "legacy@example.com";
    await registerVerifiedUser(email);
    const [legacy] = await getDb().update(users).set({ isOrganizer: true, organizerSuspendedAt: new Date() })
      .where(eq(users.email, email)).returning();
    const staleToken = createAccessToken({
      userId: legacy!.id, email, isEmailVerified: true, isOrganizer: true,
    });
    const attendee = await request(app).post("/api/v1/events")
      .set("Authorization", `Bearer ${staleToken}`).send(input);

    expect(unauthenticated.status).toBe(401);
    expect(attendee.status).toBe(403);
  });

  it("gives a verified attendee a workspace when they save their first private draft", async () => {
    const accessToken = await registerVerifiedUser("organizer@example.com");
    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Campus Night",
        description: "A student party event",
        venue: "LASU Main Auditorium",
        startsAt: "2026-12-31T20:00:00+00:00",
      });

    expect(response.status).toBe(201);
    expect(body(response).data?.event).toEqual(
      expect.objectContaining({ id: expect.any(String) as unknown as string })
    );
    expect(body(response).data?.tiers).toHaveLength(0);
    const eventId = body(response).data?.event?.id;
    expect((await request(app).get(`/api/v1/events/${eventId}`)).status).toBe(404);
    const eventsResponse = await request(app).get("/api/v1/events/organizer")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(body(eventsResponse).data?.items).toHaveLength(1);
    const publish = await request(app).post(`/api/v1/events/${eventId}/publish`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(publish.status).toBe(409);

    const [user] = await getDb().select().from(users);
    expect(user?.isOrganizer).toBe(false);
    expect(user?.organizerApprovedAt).toBeInstanceOf(Date);
  });

  it("rejects event creation with invalid input", async () => {
    const accessToken = await registerVerifiedUser("organizer-invalid@example.com", true);

    // Missing required fields: title, venue, startsAt, tiers
    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ description: "No other fields" });

    expect(response.status).toBe(422);
  });

  it("lets an approved client submit an empty tier list", async () => {
    const accessToken = await registerVerifiedUser("organizer-notiers@example.com", true);

    const response = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Campus Night",
        description: "A student party event",
        venue: "LASU Main Auditorium",
        startsAt: "2026-12-31T20:00:00+00:00",
        tiers: [],
      });

    expect(response.status).toBe(201);
  });

  it("prevents another organizer from editing the event", async () => {
    const ownerToken = await registerVerifiedUser("owner@example.com", true);
    const otherToken = await registerVerifiedUser("other@example.com", true);
    const created = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Private Event",
        description: "An owned event",
        venue: "LASU Stadium",
        startsAt: "2026-12-31T20:00:00+00:00",
        tiers: [{ name: "Regular", price: 500000, quantityAvailable: 100 }],
      });
    const eventId = body(created).data?.event?.id;

    const response = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked Event" });

    expect(response.status).toBe(404);
  });
});

// ── Event editing and deletion ─────────────────────────────────────────────────

describe("event editing and deletion", () => {
  it("allows the owner to update event fields", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-update@example.com"
    );

    const response = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Updated Campus Night", venue: "LASU New Hall" });

    expect(response.status).toBe(200);
    expect(body(response).data).toMatchObject({
      title: "Updated Campus Night",
      venue: "LASU New Hall",
    });
  });

  it("rejects an empty PATCH body", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-emptypatch@example.com"
    );

    const response = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(422);
  });

  it("requires organizer role to update an event", async () => {
    const { eventId } = await createEventAsOrganizer("organizer-edit@example.com");

    // A regular (non-organizer) authenticated user
    const regularToken = await registerVerifiedUser("regular-edit@example.com");
    const response = await request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${regularToken}`)
      .send({ title: "Attempted Hijack" });

    expect(response.status).toBe(403);
  });

  it("soft-deletes an event and makes it invisible in the list", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-delete@example.com"
    );

    const deleteResponse = await request(app)
      .delete(`/api/v1/events/${eventId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteResponse.status).toBe(200);

    // Event is no longer visible publicly
    const getResponse = await request(app).get(`/api/v1/events/${eventId}`);
    expect(getResponse.status).toBe(404);
  });

  it("returns 404 when deleting a non-existent or already-deleted event", async () => {
    const { accessToken } = await createEventAsOrganizer("organizer-del404@example.com");

    const response = await request(app)
      .delete("/api/v1/events/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it("requires authentication to delete an event", async () => {
    const { eventId } = await createEventAsOrganizer("organizer-delauth@example.com");

    const response = await request(app).delete(`/api/v1/events/${eventId}`);

    expect(response.status).toBe(401);
  });
});

// ── Ticket tier management ─────────────────────────────────────────────────────

describe("ticket tier management", () => {
  it("adds a new tier to an existing event", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-addtier@example.com"
    );

    const response = await request(app)
      .post(`/api/v1/events/${eventId}/tiers`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "VIP", price: 1000000, quantityAvailable: 50 });

    expect(response.status).toBe(201);
    expect(body(response).data).toMatchObject({
      name: "VIP",
      price: 1000000,
      quantityAvailable: 50,
    });
  });

  it("rejects a duplicate tier name within the same event", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-duptier@example.com"
    );

    // "Regular" was already created by the fixture
    const response = await request(app)
      .post(`/api/v1/events/${eventId}/tiers`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Regular", price: 200000, quantityAvailable: 20 });

    expect(response.status).toBe(409);
  });

  it("returns 404 when adding a tier to a non-existent event", async () => {
    const accessToken = await registerVerifiedUser("organizer-tiernoevent@example.com");
    // Promote manually so requireOrganizer passes
    await getDb()
      .update(users)
      .set({ organizerApprovedAt: new Date() })
      .where(eq(users.email, "organizer-tiernoevent@example.com"));

    const response = await request(app)
      .post("/api/v1/events/00000000-0000-0000-0000-000000000000/tiers")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "VIP", price: 1000000, quantityAvailable: 50 });

    expect(response.status).toBe(404);
  });

  it("updates a tier's name, price, and quantity", async () => {
    const { accessToken, eventId, tierId } = await createEventAsOrganizer(
      "organizer-updatetier@example.com"
    );

    const response = await request(app)
      .patch(`/api/v1/events/${eventId}/tiers/${tierId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Economy", price: 250000, quantityAvailable: 200 });

    expect(response.status).toBe(200);
    expect(body(response).data).toMatchObject({
      name: "Economy",
      price: 250000,
      quantityAvailable: 200,
    });
  });

  it("rejects an empty tier PATCH body", async () => {
    const { accessToken, eventId, tierId } = await createEventAsOrganizer(
      "organizer-emptytier@example.com"
    );

    const response = await request(app)
      .patch(`/api/v1/events/${eventId}/tiers/${tierId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(response.status).toBe(422);
  });

  it("rejects a tier update to a name already used in the event", async () => {
    const { accessToken, eventId } = await createEventAsOrganizer(
      "organizer-tierconflict@example.com"
    );

    // Add a second tier
    const addRes = await request(app)
      .post(`/api/v1/events/${eventId}/tiers`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "VIP", price: 1000000, quantityAvailable: 50 });

    expect(addRes.status).toBe(201);
    const vipTierId = body(addRes).data?.id as string;

    // Try to rename VIP → Regular (name collision with the existing tier)
    const response = await request(app)
      .patch(`/api/v1/events/${eventId}/tiers/${vipTierId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Regular" });

    expect(response.status).toBe(409);
  });

  it("deletes a tier that has no reservations or sales", async () => {
    const { accessToken, eventId, tierId } = await createEventAsOrganizer(
      "organizer-deletetier@example.com"
    );

    const response = await request(app)
      .delete(`/api/v1/events/${eventId}/tiers/${tierId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it("returns 404 when deleting a tier from a non-owned event", async () => {
    const { eventId, tierId } = await createEventAsOrganizer("organizer-tiernot@example.com");

    // A different organizer
    const otherToken = await registerVerifiedUser("other-tiernot@example.com");
    await getDb()
      .update(users)
      .set({ organizerApprovedAt: new Date() })
      .where(eq(users.email, "other-tiernot@example.com"));

    const response = await request(app)
      .delete(`/api/v1/events/${eventId}/tiers/${tierId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
  });

  it("requires organizer role to manage tiers", async () => {
    const { eventId, tierId } = await createEventAsOrganizer("organizer-tierrole@example.com");
    const regularToken = await registerVerifiedUser("regular-tierrole@example.com");

    const addRes = await request(app)
      .post(`/api/v1/events/${eventId}/tiers`)
      .set("Authorization", `Bearer ${regularToken}`)
      .send({ name: "VIP", price: 1000000, quantityAvailable: 10 });

    const deleteRes = await request(app)
      .delete(`/api/v1/events/${eventId}/tiers/${tierId}`)
      .set("Authorization", `Bearer ${regularToken}`);

    expect(addRes.status).toBe(403);
    expect(deleteRes.status).toBe(403);
  });
});
