import { logger } from "../logger";
import Schema, { ParseError } from "typebox/schema";
import Type, { type Static } from "typebox";

const CoerceNumber = Type.Decode(Type.Union([Type.String(), Type.Number()]), (value) => Number(value));

const envSchema = Type.Object({
	REDIS_HOST: Type.String(),
	REDIS_PORT: CoerceNumber,
	REDIS_USER: Type.String(),
	REDIS_PASSWORD: Type.String(),
	GENERAL_POSTGRES_URI: Type.String(),
	SKINS_MYSQL_URI: Type.String(),
	PORT: CoerceNumber,
	/** Listen address. `127.0.0.1` keeps the panel API off the LAN: Traefik runs on the host. */
	HOST: Type.Optional(Type.String()),
	BOT_GUARD_TOKEN: Type.String(),
	BOT_GUARD_TOKEN_DEV: Type.Optional(Type.String({ description: "Only local development" })),
	/** Base URL for the Telegram Bot API. Set it when the default endpoint is blocked (e.g. a local relay). */
	TG_API_BASE: Type.Optional(Type.String({ description: "Bot API base URL, e.g. http://127.0.0.1:8081/bot" })),
	RCON_PASSWORD: Type.String(),
	GOTIFY_URL: Type.Optional(Type.String()),
	GOTIFY_TOKEN: Type.Optional(Type.String()),
	/** Secret configured on the GitHub organization webhook. */
	GITHUB_WEBHOOK_SECRET: Type.Optional(Type.String()),
	/** Telegram chat target for GitHub pushes, `g_infra` by default. */
	GITHUB_TG_TARGET: Type.Optional(Type.String()),
	/** Comma-separated repository allowlist, all organization repositories by default. */
	GITHUB_REPOS: Type.Optional(Type.String()),
	/** Separate database on the general Postgres server for atlas build metrics. */
	BUILD_METRICS_POSTGRES_URI: Type.Optional(Type.String()),
	/** Bearer token used by atlas CI to upload build sizes. */
	BUILD_METRICS_TOKEN: Type.Optional(Type.String()),
	NATS_USER: Type.String(),
	NATS_PASSWORD: Type.String(),
	NATS_HOST: Type.String(),
	VOLUME_URL: Type.String(),
	PUBLIC_API_URL: Type.Optional(Type.String({ default: "https://api.fasberry.fun" })),
	MINIO_HOST: Type.String(),
	MINIO_PORT: CoerceNumber,
	MINIO_ACCESS_KEY: Type.String(),
  MINIO_SECRET_KEY: Type.String(),
	verbose: Type.Optional(Type.Boolean())
});

export type Env = Static<typeof envSchema> & { PROD: boolean };

let env: Env;
export const getEnv = () => env;

export function initEnv() {
	try {
		const data = Schema.Parse(envSchema, Bun.env);

		env = {
			...data,
			PROD: Bun.env.NODE_ENV === "production",
		};

    logger.info("Env is fine");
	} catch (e) {
		if (e instanceof ParseError) {
			logger.error("Env error:\n", e.errors);
		} else {
			logger.error("Env error:\n", String(e));
		}

		process.exit(1);
	}
}
