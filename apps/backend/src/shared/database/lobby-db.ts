import type { DB as lobbyDBType } from "@repo/shared/types/db/lobby-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { isProduction, LOBBY_MYSQL_URI as uri } from "../env";
import { appLogger } from "#/utils/config/logger";

export const poolOptsHooks = (name: string) => {
	if (isProduction) return {};

	const dbLogger = appLogger.withTag("Database").withTag(name);

	return {
		onCreateConnection: async () => {
			dbLogger.info(`New connection established`);
		},
		onDestroyConnection: async () => {
			dbLogger.warn(`Connection destroyed`);
		},
	};
};

const config: PoolOptions = {
	uri,
	connectionLimit: 10,
};

export const lobbyPool: Pool = createPool(config);

export const lobby = new Kysely<lobbyDBType>({
	dialect: new MysqlDialect({
		pool: lobbyPool,
		...poolOptsHooks("Lobby"),
	}),
});
