
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

const app = createApp();
const emailSender = new MemoryEmailSender();

interface AuthResponseBody {
  data: {
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
  it("registers a user and sends a verification email", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });

    expect(response.status).toBe(201);
    expect(authBody(response).data.user).toMatchObject({
      email: "student@example.com",
      isEmailVerified: false,
      isOrganizer: false,
    });
    expect(authBody(response).data.user?.passwordHash).toBeUndefined();
    expect(emailSender.messages).toHaveLength(1);
  });

  it("rejects a duplicate email", async () => {
    const input = {
      email: "student@example.com",
      password: "correct horse battery staple",
    };

    await request(app).post("/api/v1/auth/register").send(input);
    const response = await request(app).post("/api/v1/auth/register").send(input);

    expect(response.status).toBe(409);
    expect(authBody(response).message).toBe("Email is already registered");
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
  it("logs in with the correct password and rejects a wrong password", async () => {
    const input = {
      email: "student@example.com",
      password: "correct horse battery staple",
    };
    await request(app).post("/api/v1/auth/register").send(input);

    const login = await request(app).post("/api/v1/auth/login").send(input);
    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({
        ...input,
        password: "incorrect password",
      });

    expect(login.status).toBe(200);
    expect(authBody(login).data.accessToken).toEqual(expect.any(String));
    expect(wrongPassword.status).toBe(401);
  });

  it("verifies an email using the emailed token", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });
    const message = emailSender.messages[0];
    const token = message?.text.split(": ")[1];

    const response = await request(app).post("/api/v1/auth/verify-email").send({ token });

    expect(response.status).toBe(200);
  });

  it("requires authentication to resend verification", async () => {
    const response = await request(app).post("/api/v1/auth/resend-verification").send();

    expect(response.status).toBe(401);
  });

  it("resends verification and invalidates the previous token", async () => {
    const registration = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });
    const accessToken = authBody(registration).data.accessToken;
    const firstToken = emailSender.messages[0]?.text.split(": ")[1];
    if (!accessToken || !firstToken) {
      throw new Error("Registration did not create verification credentials");
    }

    const resend = await request(app)
      .post("/api/v1/auth/resend-verification")
      .set("Authorization", `Bearer ${accessToken}`)
      .send();
    const secondToken = emailSender.messages[1]?.text.split(": ")[1];
    const oldTokenAttempt = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: firstToken });

    expect(resend.status).toBe(200);
    expect(secondToken).toBeDefined();
    expect(oldTokenAttempt.status).toBe(401);
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
  it("rotates refresh tokens and rejects the old token", async () => {
    const input = {
      email: "student@example.com",
      password: "correct horse battery staple",
    };
    const registration = await request(app).post("/api/v1/auth/register").send(input);
    const oldRefreshToken = authBody(registration).data.refreshToken;
    if (!oldRefreshToken) {
      throw new Error("Registration did not return a refresh token");
    }

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
    const registration = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });
    const body = authBody(registration).data;
    if (!body.accessToken || !body.refreshToken) {
      throw new Error("Registration did not return a token pair");
    }

    const logout = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${body.accessToken}`)
      .send();
    const refresh = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: body.refreshToken });

    expect(logout.status).toBe(200);
    expect(refresh.status).toBe(401);
  });

  it("logs out one device by revoking its refresh token", async () => {
    const registration = await request(app).post("/api/v1/auth/register").send({
      email: "student@example.com",
      password: "correct horse battery staple",
    });
    const body = authBody(registration).data;
    const refreshToken = body.refreshToken;
    const accessToken = body.accessToken;
    if (!refreshToken || !accessToken) {
      throw new Error("Registration did not return a token pair");
    }

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken });
    const refresh = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });

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
    const registration = await request(app).post("/api/v1/auth/register").send(input);
    const oldRefreshToken = authBody(registration).data.refreshToken;
    if (!oldRefreshToken) {
      throw new Error("Registration did not return a refresh token");
    }

    await request(app).post("/api/v1/auth/forgot-password").send({ email: input.email });
    const message = emailSender.messages.at(-1);
    const token = message?.text.split(": ")[1];

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
