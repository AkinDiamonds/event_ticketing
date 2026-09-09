import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// This test requires NO running database or external services.
// It exercises the Express app factory directly, proving construction
// and startup are properly separated.

const app = createApp();

describe("GET /api/health", () => {
  it("returns 200 with success envelope", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      statusCode: 200,
      message: "OK",
      data: { status: "ok" },
    });
  });

  it("sets Content-Type to application/json", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
