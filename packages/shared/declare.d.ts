declare global {
	namespace NodeJS {
		interface ProcessEnv {
			SKINS_DATABASE_URL: string;
			LANDS_DATABASE_URL: string;
			MAIN_DATABASE_URL: string;
			LUCKPERMS_DATABASE_URL: string;
			PAYMENTS_DATABASE_URL: string;
			CMI_DATABASE_URL: string;
			PLAYER_POINTS_DATABASE_URL: string;
			REPUTATION_DATABASE_URL: string;
			BISQUITE_DATABASE_URL: string;
			LOBBY_DATABASE_URL: string;
			SQLITE_DATABASE_URL: string;
			LIBERTYBANS_DATABASE_URL: string;
			GENERAL_DATABASE_URL: string;
		}
	}

	interface PaginatedMeta {
		hasNextPage: boolean;
		hasPrevPage: boolean;
		endCursor?: string;
		startCursor?: string;
	}
}

export {};
