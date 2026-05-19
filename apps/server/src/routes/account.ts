import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { toPublicUser } from "../utils/security.js";

export function accountRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));

  router.get(
    "/me",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: auth.userId },
        include: {
          ownedCosmetics: { include: { cosmetic: true } },
          stats: true
        }
      });

      res.json({
        user: toPublicUser(user),
        cosmetics: user.ownedCosmetics.map((owned) => ({
          id: owned.cosmeticId,
          name: owned.cosmetic.name,
          slot: owned.cosmetic.slot,
          equipped: owned.equipped
        })),
        stats: user.stats
      });
    })
  );

  return router;
}
