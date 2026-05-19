import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { loginSchema, refreshSchema, registerSchema } from "@nulldistrict/shared";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import {
  createRefreshToken,
  hashPassword,
  hashToken,
  signAccessToken,
  toPublicUser,
  verifyPassword
} from "../utils/security.js";

const REFRESH_DAYS = 30;

export function authRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post(
    "/register",
    validateBody(registerSchema),
    asyncHandler(async (req, res) => {
      const { username, email, password } = req.body as typeof registerSchema._output;
      const normalizedEmail = email.toLowerCase();

      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email: normalizedEmail }]
        },
        select: { username: true, email: true }
      });

      if (existing?.username.toLowerCase() === username.toLowerCase()) {
        throw new HttpError(409, "Username is already taken.", "USERNAME_TAKEN");
      }
      if (existing?.email.toLowerCase() === normalizedEmail) {
        throw new HttpError(409, "Email is already registered.", "EMAIL_TAKEN");
      }

      const passwordHash = await hashPassword(password);
      const refreshToken = createRefreshToken();
      const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
          currencies: {
            create: [
              { type: "SOFT", amount: 100 },
              { type: "PREMIUM", amount: 0 }
            ]
          },
          unlockedAreas: { create: { areaId: "signal-haven" } },
          stats: { create: {} },
          sessions: {
            create: {
              tokenHash: hashToken(refreshToken),
              userAgent: req.header("user-agent"),
              ipAddress: req.ip,
              expiresAt
            }
          }
        }
      });

      const accessToken = signAccessToken({
        sub: user.id,
        username: user.username,
        role: user.role
      });

      res.status(201).json({ accessToken, refreshToken, user: toPublicUser(user) });
    })
  );

  router.post(
    "/login",
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const { identifier, password } = req.body as typeof loginSchema._output;
      const normalized = identifier.toLowerCase();
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username: { equals: identifier, mode: "insensitive" } }, { email: normalized }]
        }
      });

      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        throw new HttpError(401, "Invalid username/email or password.", "INVALID_CREDENTIALS");
      }
      if (user.isBanned) {
        throw new HttpError(403, user.banReason ?? "Account is banned.", "ACCOUNT_BANNED");
      }

      const refreshToken = createRefreshToken();
      await prisma.sessionToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          userAgent: req.header("user-agent"),
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
        }
      });

      const accessToken = signAccessToken({
        sub: user.id,
        username: user.username,
        role: user.role
      });

      res.json({ accessToken, refreshToken, user: toPublicUser(user) });
    })
  );

  router.post(
    "/refresh",
    validateBody(refreshSchema),
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.body as typeof refreshSchema._output;
      const session = await prisma.sessionToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
        include: { user: true }
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new HttpError(401, "Refresh token is invalid or expired.", "INVALID_REFRESH");
      }
      if (session.user.isBanned) {
        throw new HttpError(403, session.user.banReason ?? "Account is banned.", "ACCOUNT_BANNED");
      }

      const nextRefreshToken = createRefreshToken();
      await prisma.$transaction([
        prisma.sessionToken.update({
          where: { id: session.id },
          data: { revokedAt: new Date() }
        }),
        prisma.sessionToken.create({
          data: {
            userId: session.userId,
            tokenHash: hashToken(nextRefreshToken),
            userAgent: req.header("user-agent"),
            ipAddress: req.ip,
            expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
          }
        })
      ]);

      const accessToken = signAccessToken({
        sub: session.user.id,
        username: session.user.username,
        role: session.user.role
      });

      res.json({
        accessToken,
        refreshToken: nextRefreshToken,
        user: toPublicUser(session.user)
      });
    })
  );

  router.post(
    "/logout",
    validateBody(refreshSchema),
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.body as typeof refreshSchema._output;
      await prisma.sessionToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() }
      });
      res.status(204).send();
    })
  );

  return router;
}
