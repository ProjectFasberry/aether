import { getEnv } from "../env";
import type { PoolOptions } from "mysql2";
import type { DB } from "@gen/db/plan";
import { createDatabase } from "@repo/core/utils/database";
import { applyMySqlQueryTimeout, DB_CONNECT_TIMEOUT_MS, DB_POOL_QUEUE_LIMIT } from "./timeouts";

export const config: PoolOptions = {
	uri: getEnv().PLAN_MYSQL_URI,
	connectionLimit: 10,
	connectTimeout: DB_CONNECT_TIMEOUT_MS,
	waitForConnections: true,
	queueLimit: DB_POOL_QUEUE_LIMIT,
};
const database = createDatabase<DB>()({
  name: "Plan", dialect: "mysql", config,
})
applyMySqlQueryTimeout(database.pool);
export const planPool = database.pool
export const plan = database.connection
