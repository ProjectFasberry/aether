declare global {
	namespace NodeJS {
		interface ProcessEnv {
			REDIS_HOST: string;
			REDIS_PORT: number;
			REDIS_USER: string;
			REDIS_PASSWORD: string;

			GENERAL_POSTGRES_URI: string;
			PORT: string;

			BOT_GUARD_TOKEN: string;
		}
	}
}

export {};
