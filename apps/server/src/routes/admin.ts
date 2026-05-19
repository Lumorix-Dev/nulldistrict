import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { adminBanSchema, adminCreateShopProductSchema, adminGrantCurrencySchema } from "@nulldistrict/shared";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, HttpError } from "../utils/http.js";

export function adminRoutes(prisma: PrismaClient) {
  const router = Router();
  router.use(requireAuth(prisma));
  router.use(requireRole(["ADMIN", "DEVELOPER"]));

  router.get(
    "/users",
    asyncHandler(async (_req, res) => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          premiumCurrency: true,
          softCurrency: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" },
        take: 100
      });
      res.json({ users });
    })
  );

  router.post(
    "/ban",
    validateBody(adminBanSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const { userId, reason } = req.body as typeof adminBanSchema._output;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isBanned: true, banReason: reason } }),
        prisma.sanction.create({ data: { userId, type: "ban", reason } }),
        prisma.auditLog.create({
          data: { actorId: auth.userId, action: "BAN_USER", targetId: userId, metadata: { reason } }
        })
      ]);
      res.json({ ok: true });
    })
  );

  router.post(
    "/unban",
    validateBody(adminBanSchema.pick({ userId: true, reason: true })),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const { userId, reason } = req.body as typeof adminBanSchema._output;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isBanned: false, banReason: null } }),
        prisma.sanction.updateMany({ where: { userId, type: "ban", active: true }, data: { active: false } }),
        prisma.auditLog.create({
          data: { actorId: auth.userId, action: "UNBAN_USER", targetId: userId, metadata: { reason } }
        })
      ]);
      res.json({ ok: true });
    })
  );

  router.post(
    "/grant-currency",
    validateBody(adminGrantCurrencySchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      if (!["ADMIN", "DEVELOPER"].includes(auth.role)) {
        throw new HttpError(403, "Only admins and developers can grant currency.", "FORBIDDEN");
      }
      const { userId, currency, amount, reason } = req.body as typeof adminGrantCurrencySchema._output;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: currency === "PREMIUM" ? { premiumCurrency: { increment: amount } } : { softCurrency: { increment: amount } }
        }),
        prisma.currencyBalance.upsert({
          where: { userId_type: { userId, type: currency } },
          create: { userId, type: currency, amount },
          update: { amount: { increment: amount } }
        }),
        prisma.auditLog.create({
          data: {
            actorId: auth.userId,
            action: "GRANT_CURRENCY",
            targetId: userId,
            metadata: { currency, amount, reason }
          }
        })
      ]);
      res.json({ ok: true });
    })
  );

  router.post(
    "/grant-cosmetic/:userId/:cosmeticId",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const userId = String(req.params.userId ?? "");
      const cosmeticId = String(req.params.cosmeticId ?? "");
      if (!userId || !cosmeticId) throw new HttpError(400, "Missing user or cosmetic id.", "INVALID_PARAMS");
      await prisma.$transaction([
        prisma.ownedCosmetic.upsert({
          where: { userId_cosmeticId: { userId, cosmeticId } },
          create: { userId, cosmeticId },
          update: {}
        }),
        prisma.auditLog.create({
          data: { actorId: auth.userId, action: "GRANT_COSMETIC", targetId: userId, metadata: { cosmeticId } }
        })
      ]);
      res.json({ ok: true });
    })
  );

  router.get(
    "/audit-logs",
    asyncHandler(async (_req, res) => {
      const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
      res.json({ logs });
    })
  );

  router.get(
    "/purchases",
    asyncHandler(async (_req, res) => {
      const purchases = await prisma.purchase.findMany({
        include: { user: { select: { username: true, email: true } }, product: true },
        orderBy: { createdAt: "desc" },
        take: 200
      });
      res.json({ purchases });
    })
  );

  router.post(
    "/shop-products",
    validateBody(adminCreateShopProductSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const product = await prisma.shopProduct.create({
        data: req.body as typeof adminCreateShopProductSchema._output
      });
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          action: "CREATE_PRODUCT",
          targetId: product.id,
          metadata: { slug: product.slug }
        }
      });
      res.status(201).json({ product });
    })
  );

  router.post(
    "/shop-products/:productId/disable",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const productId = String(req.params.productId ?? "");
      if (!productId) throw new HttpError(400, "Missing product id.", "INVALID_PARAMS");
      await prisma.$transaction([
        prisma.shopProduct.update({ where: { id: productId }, data: { enabled: false } }),
        prisma.auditLog.create({ data: { actorId: auth.userId, action: "DISABLE_PRODUCT", targetId: productId } })
      ]);
      res.json({ ok: true });
    })
  );

  router.post(
    "/shop-products/:productId/enable",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const productId = String(req.params.productId ?? "");
      if (!productId) throw new HttpError(400, "Missing product id.", "INVALID_PARAMS");
      await prisma.$transaction([
        prisma.shopProduct.update({ where: { id: productId }, data: { enabled: true } }),
        prisma.auditLog.create({ data: { actorId: auth.userId, action: "ENABLE_PRODUCT", targetId: productId } })
      ]);
      res.json({ ok: true });
    })
  );

  return router;
}
