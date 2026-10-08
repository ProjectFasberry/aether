declare global {
	namespace NodeJS {
		interface ProcessEnv {
			INFISICAL_CLIENT_ID: string;
			INFISICAL_CLIENT_SECRET: string;
			INFISICAL_PROJECT_ID: string;
			INFISICAL_API_URL: string;
		}
	}
}

export {};
