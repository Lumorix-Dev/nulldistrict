import { Prisma, type PrismaClient } from "@prisma/client";
import { Router } from "express";
import { questProgressBodySchema } from "@nulldistrict/shared";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/http.js";
import { advanceQuest, listQuestProgress } from "../utils/gameRewards.js";

export function questRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      res.json({ quests: await listQuestProgress(prisma, auth.userId) });
    })
  );

  router.post(
    "/progress",
    validateBody(questProgressBodySchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const body = req.body as typeof questProgressBodySchema._output;
      const quests = await advanceQuest(prisma, auth.userId, body.questId, body.amount);

      if (body.storyFlag) {
        const character = await prisma.character.findFirst({
          where: { userId: auth.userId },
          orderBy: { updatedAt: "desc" }
        });
        if (character) {
          const flags = typeof character.storyFlags === "object" && character.storyFlags ? character.storyFlags : {};
          await prisma.character.update({
            where: { id: character.id },
            data: {
              storyFlags: {
                ...(flags as Record<string, unknown>),
                [body.storyFlag.key]: body.storyFlag.value
              } as Prisma.InputJsonObject
            }
          });
        }
      }

      res.json({ quests });
    })
  );

  return router;
}
