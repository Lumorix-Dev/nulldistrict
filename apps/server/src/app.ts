import express, { type RequestHandler } from "express";
import { createRequire } from "node:module";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { PrismaClient } from "@prisma/client";
import { corsOrigins } from "./config/env.js";
import { logger } from "./config/logger.js";
import { accountRoutes } from "./routes/account.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { characterRoutes } from "./routes/characters.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { questRoutes } from "./routes/quests.js";
import { shopRoutes, stripeWebhookRoute } from "./routes/shop.js";
import { statusRoutes } from "./routes/status.js";
import { errorHandler } from "./utils/http.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as (options: { logger: typeof logger }) => RequestHandler;

export interface AppOptions {
  prisma: PrismaClient;
  getConnectedPlayers?: () => number;
  startedAt?: Date;
}

export function createApp(options: AppOptions) {
  const app = express();
  const startedAt = options.startedAt ?? new Date();

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed.`));
      },
      credentials: true
    })
  );
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false
    })
  );
  app.use(pinoHttp({ logger }));

  app.post("/api/shop/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookRoute(options.prisma));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", statusRoutes(options.prisma, options.getConnectedPlayers ?? (() => 0), startedAt));
  app.use("/api/auth", authRoutes(options.prisma));
  app.use("/api/account", accountRoutes(options.prisma));
  app.use("/api/characters", characterRoutes(options.prisma));
  app.use("/api/inventory", inventoryRoutes(options.prisma));
  app.use("/api/quests", questRoutes(options.prisma));
  app.use("/api/shop", shopRoutes(options.prisma));
  app.use("/api/admin", adminRoutes(options.prisma));

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND", message: "Route not found." });
  });
  app.use(errorHandler);

  return app;
}
