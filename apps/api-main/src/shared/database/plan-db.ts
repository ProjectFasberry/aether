import { createPool, type Pool, type PoolOptions } from "mysql2";
import { env } from "../env";
import { Kysely, MysqlDialect } from "kysely";
import type { DB as planDBType } from "@repo/shared/types/db/plan";
import { poolOptsHooks } from "./lobby-db";

export const config: PoolOptions = {
	uri: env.PLAN_MYSQL_URI,
	connectionLimit: 10,
};

export const planPool: Pool = createPool(config);
const opts = poolOptsHooks("Plan")

export const plan = new Kysely<planDBType>({
	dialect: new MysqlDialect({
		pool: planPool,
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
