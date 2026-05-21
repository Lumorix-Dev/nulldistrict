import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { useItemSchema } from "@nulldistrict/shared";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, HttpError } from "../utils/http.js";
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

  router.post(
    "/use",
    validateBody(useItemSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const { itemId } = req.body as typeof useItemSchema._output;
      if (itemId !== "med_patch") {
        throw new HttpError(400, "This item cannot be used yet.", "ITEM_NOT_USABLE");
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { userId_itemId: { userId: auth.userId, itemId } }
      });
      if (!item || item.quantity <= 0) {
        throw new HttpError(404, "Item not found in inventory.", "ITEM_NOT_FOUND");
      }

      if (item.quantity === 1) {
        await prisma.inventoryItem.delete({ where: { id: item.id } });
      } else {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: 1 } }
        });
      }

      res.json({ inventory: await listInventory(prisma, auth.userId), effect: { heal: 35 } });
    })
  );

  return router;
}
