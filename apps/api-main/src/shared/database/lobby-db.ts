import type { DB as lobbyDBType } from "@repo/shared/types/db/lobby-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { isProduction, env } from "../env";
import { appLogger } from "#/utils/config/logger";

export const poolOptsHooks = (name: string) => {
	const dbLogger = appLogger.withTag("Database").withTag(name);

	return {
		dbLogger,
		hooks: !isProduction ? {
			onCreateConnection: async () => {
				dbLogger.info(`New connection established`);
			},
			onDestroyConnection: async () => {
				dbLogger.warn(`Connection destroyed`);
			},
		} : {}
	};
};

const config: PoolOptions = {
	uri: env.LOBBY_MYSQL_URI,
	connectionLimit: 10,
};

export const lobbyPool: Pool = createPool(config);
const opts = poolOptsHooks("Lobby")

export const lobby = new Kysely<lobbyDBType>({
	dialect: new MysqlDialect({
		pool: lobbyPool,
		...opts.hooks,
	}),
	log(event) {
		if (event.level === "error") {
			opts.dbLogger.error("Query failed : ", {
				durationMs: event.queryDurationMillis,
				error: event.error,
				sql: event.query.sql
			});
		}
	}
});