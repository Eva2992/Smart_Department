import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Health & Core API Integration", () => {
  it("GET /api/v1/health returns 200 OK and health metadata", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("JU CSE Smart Schedular API is healthy");
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.data.version).toBe("1.0.0");
  });

  it("GET /non-existent-route returns 404 with standard error envelope", async () => {
    const res = await request(app).get("/non-existent-route");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Cannot GET /non-existent-route");
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
