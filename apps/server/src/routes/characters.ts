import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { createCharacterSchema, type CharacterSummary } from "@nulldistrict/shared";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/http.js";

function toCharacterSummary(character: {
  id: string;
  name: string;
  className: string;
  level: number;
  xp: number;
  skillPoints: number;
  areaId: string;
  createdAt: Date;
}): CharacterSummary {
  return {
    id: character.id,
    name: character.name,
    className: character.className as CharacterSummary["className"],
    level: character.level,
    xp: character.xp,
    skillPoints: character.skillPoints,
    areaId: character.areaId as CharacterSummary["areaId"],
    createdAt: character.createdAt.toISOString()
  };
}

export function characterRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const characters = await prisma.character.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: "asc" }
      });
      res.json({ characters: characters.map(toCharacterSummary) });
    })
  );

  router.post(
    "/",
    validateBody(createCharacterSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const count = await prisma.character.count({ where: { userId: auth.userId } });
      if (count >= 4) {
        return res.status(409).json({ error: "CHARACTER_LIMIT", message: "Beta accounts can hold four characters." });
      }

      const payload = req.body as typeof createCharacterSchema._output;
      const character = await prisma.character.create({
        data: {
          userId: auth.userId,
          name: payload.name,
          className: payload.className,
          areaId: "signal-haven"
        }
      });

      res.status(201).json({ character: toCharacterSummary(character) });
    })
  );

  return router;
}
