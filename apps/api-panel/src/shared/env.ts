import * as z from "zod/v4";
import { appLogger } from "./logger";

const envSchema = z.object({
	REDIS_HOST: z.string(),
	REDIS_PORT: z.string().transform(Number),
	REDIS_USER: z.string(),
	REDIS_PASSWORD: z.string(),
	GENERAL_POSTGRES_URI: z.string(),
	PORT: z.string().transform(Number),
	BOT_GUARD_TOKEN: z.string(),
	RCON_PASSWORD: z.string(),
	WATCHTOWER_API_TOKEN: z.string(),
	WATCHTOWER_PORT: z.string(),
	WATCHTOWER_HOST: z.string(),
	NATS_USER: z.string(),
	NATS_PASSWORD: z.string(),
	NATS_HOST: z.string(),
	// TEST: z.string()
});

export type Env = z.infer<typeof envSchema> & { PROD: boolean };

export let env: Env;

export function initEnv() {
	const result = envSchema.safeParse(Bun.env);

	if (!result.success) {
		appLogger.error("Env error:\n", result.error);
		process.exit(1);
	}

	env = {
		...result.data,
		PROD: Bun.env.NODE_ENV === "production",
	};
}
