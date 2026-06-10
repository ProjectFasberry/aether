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
	BOT_GUARD_TOKEN: Type.String(),
	BOT_GUARD_TOKEN_DEV: Type.Optional(Type.String({ description: "Only local development" })),
	RCON_PASSWORD: Type.String(),
	WATCHTOWER_API_TOKEN: Type.String(),
	WATCHTOWER_PORT: Type.String(),
	WATCHTOWER_HOST: Type.String(),
	NATS_USER: Type.String(),
	NATS_PASSWORD: Type.String(),
	NATS_HOST: Type.String(),
	VOLUME_URL: Type.String(),
	MINIO_HOST: Type.String(),
	MINIO_PORT: CoerceNumber,
	MINIO_ACCESS_KEY: Type.String(),
	MINIO_SECRET_KEY: Type.String(),
});

export type Env = Static<typeof envSchema> & { PROD: boolean };

export let env: Env;

export function initEnv() {
	try {
		const result = Schema.Parse(envSchema, Bun.env);

		env = {
			...result,
			PROD: Bun.env.NODE_ENV === "production",
		};

		logger.success("Env is fine");
	} catch (e) {
		if (e instanceof ParseError) {
			logger.error("Env error:\n", e.errors);
		} else {
			logger.error("Env error:\n", String(e));
		}

		process.exit(1);
	}
}
