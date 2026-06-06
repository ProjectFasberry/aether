import { appLogger } from "#/shared/constants/logger";
import * as z from "zod";

export const isProduction = Bun.env.NODE_ENV === "production";

const envSchema = z.object({
  PORT: z.coerce.number(),
  NATS_HOST: z.string().min(1),
  NATS_USER: z.string().min(1),
  NATS_PASSWORD: z.string().min(1),
  SKINS_MYSQL_URI: z.url(),
  REPUTATION_MYSQL_URI: z.url(),
  PLAYERPOINTS_MYSQL_URI: z.url(),
  LOBBY_MYSQL_URI: z.url(),
  BISQUITE_MYSQL_URI: z.url(),
  GENERAL_POSTGRES_URI: z.url(),
  LIBERTYBANS_POSTGRES_URI: z.url(),
  LUCKPERMS_POSTGRES_URI: z.url(),
  PLAN_MYSQL_URI: z.url(),
  FRONTEND_URL: z.url(),
  VOLUME_URL: z.url(),
  MAP_URL: z.string().min(1),
  MINIO_HOST: z.string().min(1),
  MINIO_PORT: z.coerce.number(),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number(),
  REDIS_USER: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
  CRYPTO_PAY_TESTNET_TOKEN: z.string().min(1),
  CAP_URL: z.url(),
  CAP_SITE_KEY: z.string().min(1),
  CAP_SECRET: z.string().min(1),
  PANEL_URL: z.url(),
  PANEL_USER: z.string().min(1),
  PANEL_PASSWORD: z.string().min(1),
  RCON_PASSWORD: z.string().min(1),
  MINESKIN_API_KEY: z.string().min(1),
  MINESKIN_AES_SECRET_KEY: z.string().min(1),
  HELEKET_MERCHANT_KEY: z.string().min(1).or(z.optional(z.string().default("test"))),
  HELEKET_PAYMENT_KEY: z.string().min(1).or(z.optional(z.string().default("test"))),
  HELEKET_PAYOUT_KEY: z.string().min(1).or(z.optional(z.string().default("test"))),
});

export type Env = z.infer<typeof envSchema>;

export let env: Env;

export function initEnv() {
  const { success, data, error } = envSchema.safeParse(Bun.env);

  if (!success) {
    appLogger.error("Env error:\n", error);
    process.exit(1);
  }

  env = data
  appLogger.success("Env is fine");
}
