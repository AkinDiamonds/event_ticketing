import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { closeDb, getDb } from "#config/db.js";
import {
  emailVerificationTokens,
  passwordResetTokens,
  refreshTokens,
  users,
} from "./auth.schema.js";
import { MemoryEmailSender } from "#shared/utils/email.js";
import { setEmailSender } from "./auth.service.js";
import { events, ticketTiers } from "#features/events/events.schema.js";
import { orders, orderItems, tickets } from "#features/orders/orders.schema.js";

const app = createApp();
const emailSender = new MemoryEmailSender();

interface AuthResponseBody {
  data: {
    email?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: Record<string, unknown>;
  };
  message?: string;
}

function authBody(response: { body: unknown }): AuthResponseBody {
  return response.body as AuthResponseBody;
}

function openApiBody(response: { body: unknown }): {
  paths: Record<string, unknown>;
} {
  return response.body as { paths: Record<string, unknown> };
}

describe("GET /api/docs.json", () => {
  it("includes the auth paths in the generated OpenAPI document", async () => {
    const response = await request(app).get("/api/docs.json");

    expect(response.status).toBe(200);
    expect(openApiBody(response).paths["/api/v1/auth/register"]).toBeDefined();
    expect(openApiBody(response).paths["/api/v1/auth/refresh"]).toBeDefined();
  });
});

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
  emailSender.messages.length = 0;
  setEmailSender(emailSender);
});

afterAll(async () => {
  await closeDb();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a user, sends verification email, but withholds tokens", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });

    expect(response.status).toBe(201);
    expect(authBody(response).data.email).toBe("student@example.com");
    expect(authBody(response).data.accessToken).toBeUndefined();
    expect(emailSender.messages).toHaveLength(1);
    expect(emailSender.messages[0]?.subject).toContain("Verify your email");
  });

  it("allows re-registering an unverified email (anti-squatting protection)", async () => {
    const input1 = {
      email: "squatted@example.com",
      password: "first password",
    };
    const input2 = {
      email: "squatted@example.com",
      password: "second real password",
    };

    // First unverified attempt
    const firstRes = await request(app).post("/api/v1/auth/register").send(input1);
    expect(firstRes.status).toBe(201);

    // Second registration attempt for unverified email should succeed and refresh token
    const secondRes = await request(app).post("/api/v1/auth/register").send(input2);
    expect(secondRes.status).toBe(201);
    expect(emailSender.messages).toHaveLength(2);

    // Verify with the latest token
    const latestToken = emailSender.messages[1]?.text.match(/[a-f0-9]{32,}/i)?.[0];
    expect(latestToken).toBeDefined();

    const verifyRes = await request(app).post("/api/v1/auth/verify-email").send({ token: latestToken });
    expect(verifyRes.status).toBe(200);

    // Now verified: subsequent register attempt must be rejected with 409
    const thirdRes = await request(app).post("/api/v1/auth/register").send(input2);
    expect(thirdRes.status).toBe(409);
    expect(authBody(thirdRes).message).toBe("Email is already registered");
  });

  it("rejects invalid input", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: "not-an-email",
      password: "short",
    });

    expect(response.status).toBe(422);
  });
});

describe("login and email verification", () => {
  it("prevents login before email verification and permits after", async () => {
    const input = {
      email: "student@example.com",
      password: "correct horse battery staple",
    };
    await request(app).post("/api/v1/auth/register").send(input);

    // Login before verification is forbidden (403)
    const unverifiedLogin = await request(app).post("/api/v1/auth/login").send(input);
    expect(unverifiedLogin.status).toBe(403);
    expect(authBody(unverifiedLogin).message).toContain("verify your email");

    // Verify email using token from email
    const token = emailSender.messages[0]?.text.match(/[a-f0-9]{32,}/i)?.[0];
    const verifyRes = await request(app).post("/api/v1/auth/verify-email").send({ token });
    expect(verifyRes.status).toBe(200);
    expect(authBody(verifyRes).data.accessToken).toEqual(expect.any(String));

    // Login after verification succeeds (200)
    const login = await request(app).post("/api/v1/auth/login").send(input);
    expect(login.status).toBe(200);
    expect(authBody(login).data.accessToken).toEqual(expect.any(String));

    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({
        ...input,
        password: "incorrect password",
      });
    expect(wrongPassword.status).toBe(401);
  });

  it("verifies an email using the emailed token", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });
    const token = emailSender.messages[0]?.text.match(/[a-f0-9]{32,}/i)?.[0];

    const response = await request(app).post("/api/v1/auth/verify-email").send({ token });

    expect(response.status).toBe(200);
    expect(authBody(response).data.user?.isEmailVerified).toBe(true);
  });

  it("requires authentication to resend verification", async () => {
    const response = await request(app).post("/api/v1/auth/resend-verification").send();

    expect(response.status).toBe(401);
  });

  it("keeps registration successful when email delivery fails", async () => {
    setEmailSender({
      send: () => Promise.reject(new Error("provider unavailable")),
    });

    const response = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });

    expect(response.status).toBe(201);
  });
});

describe("refresh and logout", () => {
  async function registerAndVerify(email = "student@example.com") {
    await request(app).post("/api/v1/auth/register").send({
      email,
      password: "correct horse battery staple",
    });
    const token = emailSender.messages.at(-1)?.text.match(/[a-f0-9]{32,}/i)?.[0];
    const verify = await request(app).post("/api/v1/auth/verify-email").send({ token });
    return authBody(verify).data;
  }

  it("rotates refresh tokens and rejects the old token", async () => {
    const session = await registerAndVerify();
    const oldRefreshToken = session.refreshToken!;

    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefreshToken });
    const reused = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefreshToken });

    expect(refresh.status).toBe(200);
    expect(authBody(refresh).data.refreshToken).not.toBe(oldRefreshToken);
    expect(reused.status).toBe(401);
  });

  it("requires authentication for logout-all", async () => {
    const response = await request(app).post("/api/v1/auth/logout-all");

    expect(response.status).toBe(401);
  });

  it("revokes every refresh token with logout-all", async () => {
    const session = await registerAndVerify();

    const logout = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send();
    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken });

    expect(logout.status).toBe(200);
    expect(refresh.status).toBe(401);
  });

  it("logs out one device by revoking its refresh token", async () => {
    const session = await registerAndVerify();

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ refreshToken: session.refreshToken });
    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken });

    expect(logout.status).toBe(200);
    expect(refresh.status).toBe(401);
  });
});

describe("auth validation and authorization failures", () => {
  it("rejects malformed request bodies and missing authentication", async () => {
    const cases = [
      request(app).post("/api/v1/auth/login").send({ email: "bad" }),
      request(app).post("/api/v1/auth/verify-email").send({}),
      request(app).post("/api/v1/auth/refresh").send({}),
      request(app).post("/api/v1/auth/forgot-password").send({ email: "bad" }),
      request(app).post("/api/v1/auth/reset-password").send({}),
    ];
    const responses = await Promise.all(cases);
    const logout = await request(app).post("/api/v1/auth/logout").send({});
    const logoutAll = await request(app).post("/api/v1/auth/logout-all").send();

    expect(responses.every((response) => response.status === 422)).toBe(true);
    expect(logout.status).toBe(401);
    expect(logoutAll.status).toBe(401);
  });
});

describe("password reset", () => {
  it("does not reveal whether an email exists", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "unknown@example.com" });

    expect(response.status).toBe(200);
  });

  it("resets the password and revokes existing refresh tokens", async () => {
    const input = {
      email: "student@example.com",
      password: "correct horse battery staple",
    };
    await request(app).post("/api/v1/auth/register").send(input);
    const verifyToken = emailSender.messages.at(-1)?.text.match(/[a-f0-9]{32,}/i)?.[0];
    const verify = await request(app).post("/api/v1/auth/verify-email").send({ token: verifyToken });
    const oldRefreshToken = authBody(verify).data.refreshToken;
    if (!oldRefreshToken) {
      throw new Error("Verification did not return a refresh token");
    }

    await request(app).post("/api/v1/auth/forgot-password").send({ email: input.email });
    const message = emailSender.messages.at(-1);
    const token = message?.text.match(/[a-f0-9]{32,}/i)?.[0];

    const reset = await request(app).post("/api/v1/auth/reset-password").send({
      token,
      password: "new secure password",
    });
    const oldTokenRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefreshToken });

    expect(reset.status).toBe(200);
    expect(oldTokenRefresh.status).toBe(401);
  });
});

// ── PATCH /api/v1/auth/me/whatsapp ───────────────────────────────────────────

describe("PATCH /api/v1/auth/me/whatsapp", () => {
  async function registerAndLogin(email = "student@example.com") {
    await request(app).post("/api/v1/auth/register").send({
      email,
      password: "correct horse battery staple",
    });
    const token = emailSender.messages.at(-1)?.text.match(/[a-f0-9]{32,}/i)?.[0];
    const verify = await request(app).post("/api/v1/auth/verify-email").send({ token });
    const { accessToken } = authBody(verify).data;
    if (!accessToken) throw new Error("No access token after verification");
    return accessToken;
  }

  it("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .send({ whatsappNumber: "+2348012345678" });

    expect(res.status).toBe(401);
  });

  it("rejects an invalid phone number format", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappNumber: "08012345678" }); // missing leading +country code

    expect(res.status).toBe(422);
  });

  it("rejects a missing body", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it("sets a valid E.164 WhatsApp number for the authenticated user", async () => {
    const token = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappNumber: "+2348012345678" });

    expect(res.status).toBe(200);
    expect(authBody(res).message).toContain("updated");

    // Confirm the number is persisted in the DB
    const [dbUser] = await getDb().select().from(users).limit(1);
    expect(dbUser?.whatsappNumber).toBe("+2348012345678");
    expect(dbUser?.whatsappSetAt).toBeDefined();
  });

  it("clears the WhatsApp number when null is supplied", async () => {
    const token = await registerAndLogin();

    // First, set a number
    await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappNumber: "+2348012345678" });

    // Now clear it
    const res = await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token}`)
      .send({ whatsappNumber: null });

    expect(res.status).toBe(200);

    const [dbUser] = await getDb().select().from(users).limit(1);
    expect(dbUser?.whatsappNumber).toBeNull();
    expect(dbUser?.whatsappSetAt).toBeNull();
  });

  it("rejects a duplicate WhatsApp number already registered to another account", async () => {
    // Register first user and set the number
    const token1 = await registerAndLogin();
    await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token1}`)
      .send({ whatsappNumber: "+2348012345678" });

    // Register second user
    const token2 = await registerAndLogin("student2@example.com");

    // Attempt to set the same number
    const res = await request(app)
      .patch("/api/v1/auth/me/whatsapp")
      .set("Authorization", `Bearer ${token2}`)
      .send({ whatsappNumber: "+2348012345678" });

    expect(res.status).toBe(409);
  });
});

