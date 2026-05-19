import type { NextFunction, Request, Response } from "express";
import type { AccountRole } from "@nulldistrict/shared";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../utils/http.js";
import { verifyAccessToken } from "../utils/security.js";

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
    username: string;
    role: AccountRole;
  };
}

export function requireAuth(prisma: PrismaClient) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header("authorization");
      if (!header?.startsWith("Bearer ")) {
        throw new HttpError(401, "Missing bearer token.", "UNAUTHORIZED");
      }

      const token = header.slice("Bearer ".length);
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, username: true, role: true, isBanned: true, banReason: true }
      });

      if (!user) throw new HttpError(401, "Account no longer exists.", "UNAUTHORIZED");
      if (user.isBanned) {
        throw new HttpError(403, user.banReason ?? "Account is banned.", "ACCOUNT_BANNED");
      }

      (req as AuthenticatedRequest).auth = {
        userId: user.id,
        username: user.username,
        role: user.role as AccountRole
      };
      next();
    } catch (error) {
      next(error instanceof HttpError ? error : new HttpError(401, "Invalid token.", "UNAUTHORIZED"));
    }
  };
}

export function requireRole(roles: AccountRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth || !roles.includes(auth.role)) {
      return next(new HttpError(403, "Insufficient account role.", "FORBIDDEN"));
    }
    next();
  };
}
