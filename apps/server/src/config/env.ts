import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dirname, "../../../../.env") });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(24).default("development-only-change-this-secret-now"),
  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:1420,http://localhost:5173,tauri://localhost"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  PAYMENT_SUCCESS_URL: z.string().url().default("https://lumorix.example/payment-success"),
  PAYMENT_CANCEL_URL: z.string().url().default("https://lumorix.example/payment-cancel"),
  SHOP_ENABLED: z.coerce.boolean().default(true),
  PREMIUM_PURCHASES_ENABLED: z.coerce.boolean().default(false),
  GITHUB_REPO: z.string().default("lumorix/nulldistrict"),
  RELEASE_CHANNEL: z.enum(["beta", "stable"]).default("beta")
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CLIENT_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
