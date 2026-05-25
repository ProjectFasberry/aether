import { Kysely, PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import type { DB as authDBType } from "@repo/shared/types/db/general-database-types";
import { poolOptsHooks } from "./lobby-db";
import { env } from "../env";

const { Pool } = pg;

const config: PoolConfig = {
	connectionString: env.GENERAL_POSTGRES_URI,
	max: 10,
};

export const generalPool = new Pool(config);

const opts = poolOptsHooks("General");

export const general = new Kysely<authDBType>({
	dialect: new PostgresDialect({
		pool: generalPool, ...opts.hooks,
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