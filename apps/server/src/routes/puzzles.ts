import { Prisma, type PrismaClient } from "@prisma/client";
import { Router } from "express";
import { puzzleSolveSchema, type QuestId } from "@nulldistrict/shared";
import { getPuzzleDefinition } from "@nulldistrict/game-data";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { advanceQuest, grantItem, listInventory } from "../utils/gameRewards.js";
import { asyncHandler, HttpError } from "../utils/http.js";

export function puzzleRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));

  router.post(
    "/solve",
    validateBody(puzzleSolveSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const body = req.body as typeof puzzleSolveSchema._output;
      const puzzle = getPuzzleDefinition(body.puzzleId);

      if (!puzzle) {
        throw new HttpError(404, "Puzzle not found.", "PUZZLE_NOT_FOUND");
      }

      const sequence = body.sequence.map((entry) => entry.trim().toLowerCase());
      const solved =
        sequence.length === puzzle.solution.length &&
        puzzle.solution.every((expected, index) => sequence[index] === expected);

      if (!solved) {
        throw new HttpError(400, puzzle.failureLine, "PUZZLE_REJECTED");
      }

      const previousProgress = await prisma.questProgress.findUnique({
        where: { userId_questId: { userId: auth.userId, questId: puzzle.questId } },
        select: { completed: true }
      });

      const quests = await advanceQuest(prisma, auth.userId, puzzle.questId as QuestId, 1);

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
              [puzzle.storyFlag.key]: puzzle.storyFlag.value
            } as Prisma.InputJsonObject
          }
        });
      }

      const inventory =
        puzzle.rewardItemId && !previousProgress?.completed
          ? await grantItem(prisma, auth.userId, puzzle.rewardItemId, 1)
          : await listInventory(prisma, auth.userId);

      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          action: "puzzle.solve",
          targetId: puzzle.id,
          metadata: {
            questId: puzzle.questId,
            areaId: puzzle.areaId,
            sequence
          } as Prisma.InputJsonObject
        }
      });

      res.json({
        solved: true,
        message: puzzle.successMessage,
        quests,
        inventory
      });
    })
  );

  return router;
}
