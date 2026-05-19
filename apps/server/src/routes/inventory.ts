import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { listInventory } from "../utils/gameRewards.js";

export function inventoryRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      res.json({ inventory: await listInventory(prisma, auth.userId) });
    })
  );

  return router;
}
