import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import { emailVerificationTokens, passwordResetTokens, refreshTokens, users } from "#features/auth/auth.schema.js";
import { events, ticketTiers } from "./events.schema.js";

const app = createApp();

type ResponseBody = {
  data?: {
    accessToken?: string;
    event?: { id: string };
    tiers?: Array<{ id: string }>;
  };
  message?: string;
};

function body(response: { body: unknown }): ResponseBody {
  return response.body as ResponseBody;
}

async function registerVerifiedUser(email: string): Promise<string> {
  const response = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "correct horse battery staple",
  });
  const accessToken = body(response).data?.accessToken;
  if (!accessToken) {
    throw new Error("Registration did not return an access token");
  }

  await getDb().update(users).set({ isEmailVerified: true }).where(
    eq(users.email, email)
  );

  return accessToken;
}

beforeEach(async () => {
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
});

describe("event creation and ownership", () => {
  it("requires authentication and verified email to create an event", async () => {
    const input = {
      title: "Campus Night",
      description: "A student party event",
      venue: "LASU Main Auditorium",
      startsAt: "2026-12-31T20:00:00+00:00",
      tiers: [{ name: "Regular", price: 500000, quantityAvailable: 100 }],
    };

    const unauthenticated = await request(app).post("/api/v1/events").send(input);
    const registration = await request(app).post("/api/v1/auth/register").send({
      email: "unverified@example.com",
      password: "correct horse battery staple",
    });
    const unverified = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${body(registration).data?.accessToken}`)
      .send(input);

    expect(unauthenticated.status).toBe(401);
    expect(unverified.status).toBe(403);
  });

  it("creates the first event and promotes the user to organizer", async () => {
    const accessToken = await registerVerifiedUser("organizer@example.com");
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

    expect(response.status).toBe(201);
    expect(body(response).data?.event).toEqual(expect.objectContaining({ id: expect.any(String) }));
    expect(body(response).data?.tiers).toHaveLength(1);

    const [user] = await getDb().select().from(users);
    expect(user?.isOrganizer).toBe(true);
  });

  it("prevents another organizer from editing the event", async () => {
    const ownerToken = await registerVerifiedUser("owner@example.com");
    const otherToken = await registerVerifiedUser("other@example.com");
    await getDb()
      .update(users)
      .set({ isOrganizer: true })
      .where(eq(users.email, "other@example.com"));
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
