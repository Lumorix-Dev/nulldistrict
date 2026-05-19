import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { VERSION, type ServerStatus } from "@nulldistrict/shared";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/http.js";

export function statusRoutes(prisma: PrismaClient, getConnectedPlayers: () => number, startedAt: Date) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "nulldistrict-server", time: new Date().toISOString() });
  });

  router.get(
    "/status",
    asyncHandler(async (_req, res) => {
      let db = "unknown";
      try {
        await prisma.$queryRaw`SELECT 1`;
        db = "ok";
      } catch {
        db = "unavailable";
      }

      const status: ServerStatus & { database: string } = {
        online: db === "ok",
        message: db === "ok" ? "Null District beta server is online." : "Server is up, database is unavailable.",
        build: VERSION,
        releaseChannel: env.RELEASE_CHANNEL,
        connectedPlayers: getConnectedPlayers(),
        startedAt: startedAt.toISOString(),
        serverTime: new Date().toISOString(),
        database: db
      };
      res.json(status);
    })
  );

  return router;
}
