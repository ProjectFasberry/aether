import { appLogger } from "#/shared/constants/logger";
import * as z from "zod";

export const isProduction = Bun.env.NODE_ENV === "production";

const envSchema = z.object({
  PORT: z.coerce.number(),
  /** Deploy stage: `prod` serves the public release channel, anything else `dev`. */
  STAGE: z.string().optional().default("dev"),
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
  VOLUME_URL: z.url(),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number(),
  REDIS_USER: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
  CAP_URL: z.url(),
  CAP_SITE_KEY: z.string().min(1),
  CAP_SECRET: z.string().min(1),
  PANEL_USER: z.string().min(1),
  PANEL_PASSWORD: z.string().min(1),
  /** Shared secret for the Velocity join gate; when unset, verification is off. */
  GATE_SECRET: z.optional(z.string().min(16)),
  MINESKIN_API_KEY: z.string().min(1),
  MINESKIN_AES_SECRET_KEY: z.string().min(1),
  verbose: z.boolean().optional().default(false)
});

export type Env = z.infer<typeof envSchema> & { PROD: boolean };;

let env: Env;
export const getEnv = () => env;

export function initEnv() {
  const { success, data, error } = envSchema.safeParse(Bun.env);

  if (!success) {
    appLogger.error({ error });
    process.exit(1);
  }

  env = {
    ...data,
    PROD: Bun.env.NODE_ENV === "production",
  };

  appLogger.info("Env is fine");
}
