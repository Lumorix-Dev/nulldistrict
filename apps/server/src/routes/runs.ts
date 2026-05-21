import { Prisma, type PrismaClient } from "@prisma/client";
import { Router } from "express";
import { runExtractSchema, type QuestId } from "@nulldistrict/shared";
import { getCaseDefinition, getItemDefinition } from "@nulldistrict/game-data";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { advanceQuest, grantItem, listInventory } from "../utils/gameRewards.js";
import { asyncHandler, HttpError } from "../utils/http.js";

export function runRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));

  router.post(
    "/extract",
    validateBody(runExtractSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const body = req.body as typeof runExtractSchema._output;
      const caseFile = getCaseDefinition(body.caseId);

      if (!caseFile) {
        throw new HttpError(404, "Case file not found.", "CASE_NOT_FOUND");
      }

      const progress = await prisma.questProgress.findMany({
        where: {
          userId: auth.userId,
          questId: { in: [...caseFile.requiredQuestIds] }
        },
        select: { questId: true, completed: true }
      });
      const completed = new Set(progress.filter((quest) => quest.completed).map((quest) => quest.questId));
      const missingQuest = caseFile.requiredQuestIds.find((questId) => !completed.has(questId));
      if (missingQuest) {
        throw new HttpError(400, "Case evidence is incomplete. Finish every case-board objective before extraction.", "CASE_INCOMPLETE");
      }

      const evidence = await prisma.inventoryItem.findUnique({
        where: { userId_itemId: { userId: auth.userId, itemId: caseFile.evidenceItemId } },
        select: { quantity: true }
      });
      if ((evidence?.quantity ?? 0) < caseFile.evidenceRequired) {
        throw new HttpError(400, `Need ${caseFile.evidenceRequired} evidence fragments before extraction.`, "EVIDENCE_INCOMPLETE");
      }

      const extractionItem = await prisma.inventoryItem.findUnique({
        where: { userId_itemId: { userId: auth.userId, itemId: caseFile.extractionItemId } },
        select: { quantity: true }
      });
      if ((extractionItem?.quantity ?? 0) < 1) {
        throw new HttpError(400, "Relay Core missing. Extraction would be empty.", "EXTRACTION_ITEM_MISSING");
      }

      const alreadyExtracted = await prisma.questProgress.findUnique({
        where: { userId_questId: { userId: auth.userId, questId: caseFile.extractionQuestId } },
        select: { completed: true }
      });

      const inventory = alreadyExtracted?.completed
        ? await listInventory(prisma, auth.userId)
        : await grantItem(prisma, auth.userId, caseFile.rewardItemId, 1);
      const quests = await advanceQuest(prisma, auth.userId, caseFile.extractionQuestId as QuestId, 1);
      const rewardItem = getItemDefinition(caseFile.rewardItemId);

      await prisma.loreFragment.upsert({
        where: { userId_fragmentId: { userId: auth.userId, fragmentId: `case-${caseFile.id}` } },
        create: {
          userId: auth.userId,
          fragmentId: `case-${caseFile.id}`,
          title: caseFile.title,
          body:
            caseFile.id === "first-signal"
              ? "The first stable route into Null District was proven by recovered fragments, a decoded terminal memory and a Relay Core extracted to Signal Haven."
              : "The Mirror Archive case proves the district can copy player routes, lock them behind synchronized operators and replay them through blackout media."
        },
        update: {}
      });

      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          action: "run.extract",
          targetId: caseFile.id,
          metadata: {
            evidence: evidence?.quantity ?? 0,
            extractionItem: caseFile.extractionItemId,
            alreadyExtracted: alreadyExtracted?.completed ?? false
          } as Prisma.InputJsonObject
        }
      });

      res.json({
        extracted: true,
        caseId: caseFile.id,
        caseTitle: caseFile.title,
        rank: "A",
        recoveredEvidence: evidence?.quantity ?? 0,
        message: `${caseFile.title} extracted. Proof is banked in Signal Haven.`,
        rewards: {
          xp: alreadyExtracted?.completed ? 0 : caseFile.rewards.xp,
          softCurrency: alreadyExtracted?.completed ? 0 : caseFile.rewards.softCurrency,
          itemName: rewardItem?.name
        },
        quests,
        inventory
      });
    })
  );

  return router;
}
