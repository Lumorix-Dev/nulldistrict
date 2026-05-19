import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";

const prisma = {
  $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  user: {},
  sessionToken: {}
} as never;

describe("server health", () => {
  it("returns health status", async () => {
    const app = createApp({ prisma, getConnectedPlayers: () => 2, startedAt: new Date("2026-05-17T00:00:00.000Z") });
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it("validates auth register input before database writes", async () => {
    const app = createApp({ prisma, getConnectedPlayers: () => 0 });
    const response = await request(app).post("/api/auth/register").send({ username: "x", email: "bad", password: "tiny" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
  });
});
