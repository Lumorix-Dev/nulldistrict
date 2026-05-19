import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { AccountRole, PublicUser } from "@nulldistrict/shared";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: AccountRole;
}

export function toPublicUser(user: {
  id: string;
  username: string;
  email: string;
  role: AccountRole;
  premiumCurrency: number;
  softCurrency: number;
  isBanned: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    premiumCurrency: user.premiumCurrency,
    softCurrency: user.softCurrency,
    isBanned: user.isBanned,
    createdAt: user.createdAt.toISOString()
  };
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1
  });
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "15m",
    issuer: "lumorix-null-district"
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "lumorix-null-district"
  }) as AccessTokenPayload & { exp: number; iat: number };
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
