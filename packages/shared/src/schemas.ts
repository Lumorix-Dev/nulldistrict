import { z } from "zod";
import { AREA_IDS, QUEST_IDS } from "./constants.js";

export const usernameSchema = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only.");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128);

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email().max(255),
  password: passwordSchema
});

export const loginSchema = z.object({
  identifier: z.string().min(3).max(255),
  password: z.string().min(1).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32)
});

export const createCharacterSchema = z.object({
  name: usernameSchema,
  className: z.enum(["Signal Runner", "Relay Warden", "Null Analyst"])
});

export const areaIdSchema = z.enum(AREA_IDS);
export const questIdSchema = z.enum(QUEST_IDS);

export const joinInstanceSchema = z.object({
  areaId: areaIdSchema,
  characterId: z.string().min(1),
  instanceId: z.string().min(1).max(64).optional()
});

export const playerNetStateSchema = z.object({
  userId: z.string(),
  characterId: z.string(),
  username: z.string(),
  areaId: areaIdSchema,
  x: z.number().finite().min(-10_000).max(50_000),
  y: z.number().finite().min(-10_000).max(20_000),
  vx: z.number().finite().min(-2_000).max(2_000),
  vy: z.number().finite().min(-2_000).max(2_000),
  facing: z.enum(["left", "right"]),
  hp: z.number().finite().min(0).max(500),
  energy: z.number().finite().min(0).max(500),
  animation: z.enum(["idle", "run", "jump", "fall", "dash", "attack", "dead"]),
  updatedAt: z.number().finite()
});

export const chatMessageSchema = z.object({
  areaId: areaIdSchema,
  message: z.string().trim().min(1).max(220)
});

export const pickupSchema = z.object({
  pickupId: z.string().min(1).max(64),
  areaId: areaIdSchema,
  x: z.number().finite(),
  y: z.number().finite()
});

export const questProgressBodySchema = z.object({
  questId: questIdSchema,
  amount: z.number().int().min(1).max(10).default(1),
  storyFlag: z
    .object({
      key: z.string().min(1).max(80),
      value: z.boolean()
    })
    .optional()
});

export const testPurchaseSchema = z.object({
  productSlug: z.string().min(1).max(80)
});

export const adminGrantCurrencySchema = z.object({
  userId: z.string().min(1),
  currency: z.enum(["SOFT", "PREMIUM"]),
  amount: z.number().int().min(1).max(100_000),
  reason: z.string().min(3).max(400)
});

export const adminBanSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(3).max(400)
});

export const adminCreateShopProductSchema = z.object({
  id: z.string().min(3).max(80),
  slug: z.string().min(3).max(80),
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(600),
  productType: z.enum(["PREMIUM_CURRENCY", "COSMETIC", "BATTLE_PASS", "FOUNDER_PACK"]),
  priceCents: z.number().int().min(0),
  premiumPrice: z.number().int().min(0).optional(),
  grantsPremium: z.number().int().min(0).optional(),
  cosmeticId: z.string().min(1).optional(),
  enabled: z.boolean().default(true)
});
