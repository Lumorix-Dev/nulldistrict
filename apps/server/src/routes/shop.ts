import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import Stripe from "stripe";
import { testPurchaseSchema } from "@nulldistrict/shared";
import { env } from "../config/env.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, HttpError } from "../utils/http.js";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
  : null;

async function grantProduct(prisma: PrismaClient, userId: string, productId: string) {
  const product = await prisma.shopProduct.findUniqueOrThrow({ where: { id: productId } });

  await prisma.$transaction(async (tx) => {
    if (product.grantsPremium) {
      await tx.user.update({
        where: { id: userId },
        data: { premiumCurrency: { increment: product.grantsPremium } }
      });
      await tx.currencyBalance.upsert({
        where: { userId_type: { userId, type: "PREMIUM" } },
        create: { userId, type: "PREMIUM", amount: product.grantsPremium },
        update: { amount: { increment: product.grantsPremium } }
      });
    }

    if (product.cosmeticId) {
      await tx.ownedCosmetic.upsert({
        where: { userId_cosmeticId: { userId, cosmeticId: product.cosmeticId } },
        create: { userId, cosmeticId: product.cosmeticId },
        update: {}
      });
    }
  });
}

export function shopRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get(
    "/products",
    asyncHandler(async (_req, res) => {
      if (!env.SHOP_ENABLED) {
        return res.json({ products: [], message: "Shop is disabled." });
      }

      const products = await prisma.shopProduct.findMany({
        where: { enabled: true },
        orderBy: { createdAt: "asc" }
      });

      res.json({ products });
    })
  );

  router.use(requireAuth(prisma));

  router.get(
    "/purchases",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const purchases = await prisma.purchase.findMany({
        where: { userId: auth.userId },
        include: { product: true },
        orderBy: { createdAt: "desc" }
      });
      res.json({
        purchases: purchases.map((purchase) => ({
          id: purchase.id,
          productTitle: purchase.product.title,
          productType: purchase.product.productType,
          provider: purchase.provider,
          status: purchase.status,
          amountCents: purchase.amountCents,
          premiumGranted: purchase.premiumGranted,
          createdAt: purchase.createdAt.toISOString()
        }))
      });
    })
  );

  router.post(
    "/purchase-test",
    validateBody(testPurchaseSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      if (!env.SHOP_ENABLED) {
        throw new HttpError(403, "Shop is disabled.", "SHOP_DISABLED");
      }

      const { productSlug } = req.body as typeof testPurchaseSchema._output;
      const product = await prisma.shopProduct.findUnique({ where: { slug: productSlug } });
      if (!product || !product.enabled) {
        throw new HttpError(404, "Shop product not found.", "PRODUCT_NOT_FOUND");
      }

      if (product.premiumPrice && product.premiumPrice > 0) {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
        if (user.premiumCurrency < product.premiumPrice) {
          throw new HttpError(402, "Not enough premium currency.", "INSUFFICIENT_PREMIUM");
        }
        await prisma.user.update({
          where: { id: auth.userId },
          data: { premiumCurrency: { decrement: product.premiumPrice } }
        });
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId: auth.userId,
          productId: product.id,
          provider: "beta-test",
          providerSessionId: `test_${Date.now()}`,
          status: "paid",
          amountCents: 0,
          premiumGranted: product.grantsPremium ?? 0
        }
      });

      await grantProduct(prisma, auth.userId, product.id);
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          action: "SHOP_TEST_PURCHASE",
          targetId: product.id,
          metadata: { purchaseId: purchase.id, productSlug: product.slug }
        }
      });

      const account = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
      res.json({ purchase, balances: { soft: account.softCurrency, premium: account.premiumCurrency } });
    })
  );

  router.post(
    "/stripe/create-checkout-session",
    validateBody(testPurchaseSchema),
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      if (!env.PREMIUM_PURCHASES_ENABLED || !stripe) {
        throw new HttpError(503, "Real-money purchases are not enabled for this beta.", "PAYMENTS_DISABLED");
      }

      const { productSlug } = req.body as typeof testPurchaseSchema._output;
      const product = await prisma.shopProduct.findUnique({ where: { slug: productSlug } });
      if (!product || !product.enabled || product.priceCents <= 0) {
        throw new HttpError(404, "Paid product not found.", "PRODUCT_NOT_FOUND");
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              product_data: { name: product.title, description: product.description },
              unit_amount: product.priceCents
            }
          }
        ],
        success_url: env.PAYMENT_SUCCESS_URL,
        cancel_url: env.PAYMENT_CANCEL_URL,
        metadata: { productId: product.id, userId: auth.userId }
      });
      if (!session.url) {
        throw new HttpError(502, "Stripe did not return a checkout URL.", "CHECKOUT_URL_MISSING");
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId: auth.userId,
          productId: product.id,
          provider: "stripe",
          providerSessionId: session.id,
          status: "pending",
          amountCents: product.priceCents,
          premiumGranted: product.grantsPremium ?? 0
        }
      });

      res.json({ url: session.url, purchaseId: purchase.id });
    })
  );

  router.post(
    "/cosmetics/:cosmeticId/equip",
    asyncHandler(async (req, res) => {
      const auth = (req as AuthenticatedRequest).auth;
      const cosmeticId = String(req.params.cosmeticId ?? "");
      if (!cosmeticId) throw new HttpError(400, "Missing cosmetic id.", "INVALID_PARAMS");
      const owned = await prisma.ownedCosmetic.findUnique({
        where: { userId_cosmeticId: { userId: auth.userId, cosmeticId } }
      });
      if (!owned) throw new HttpError(404, "Cosmetic is not owned.", "COSMETIC_NOT_OWNED");
      const cosmetic = await prisma.cosmetic.findUniqueOrThrow({ where: { id: cosmeticId } });

      await prisma.$transaction([
        prisma.ownedCosmetic.updateMany({
          where: { userId: auth.userId, cosmetic: { slot: cosmetic.slot } },
          data: { equipped: false }
        }),
        prisma.ownedCosmetic.update({
          where: { id: owned.id },
          data: { equipped: true }
        })
      ]);

      res.json({ equipped: cosmeticId });
    })
  );

  return router;
}

export function stripeWebhookRoute(prisma: PrismaClient) {
  return asyncHandler(async (req, res) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      throw new HttpError(503, "Stripe webhook is not configured.", "PAYMENTS_DISABLED");
    }

    const signature = req.header("stripe-signature");
    if (!signature) throw new HttpError(400, "Missing Stripe signature.", "MISSING_SIGNATURE");

    const event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const productId = session.metadata?.productId;
      const userId = session.metadata?.userId;
      if (productId && userId) {
        let shouldGrant = true;
        await prisma.$transaction(async (tx) => {
          const existing = await tx.purchase.findFirst({
            where: { provider: "stripe", providerSessionId: session.id }
          });
          if (existing?.status === "paid") {
            shouldGrant = false;
            return;
          }

          const product = await tx.shopProduct.findUniqueOrThrow({ where: { id: productId } });
          await tx.purchase.upsert({
            where: { id: existing?.id ?? `stripe_${session.id}` },
            create: {
              id: `stripe_${session.id}`,
              userId,
              productId,
              provider: "stripe",
              providerSessionId: session.id,
              status: "paid",
              amountCents: product.priceCents,
              premiumGranted: product.grantsPremium ?? 0
            },
            update: { status: "paid" }
          });
        });
        if (!shouldGrant) {
          return res.json({ received: true });
        }
        await grantProduct(prisma, userId, productId);
        await prisma.auditLog.create({
          data: {
            actorId: userId,
            action: "SHOP_STRIPE_PURCHASE",
            targetId: productId,
            metadata: { sessionId: session.id }
          }
        });
      }
    }

    res.json({ received: true });
  });
}
