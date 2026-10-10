import { getEnv } from "../env";
import type { PoolOptions } from "mysql2";
import type { DB } from "@gen/db/plan";
import { createDatabase } from "@repo/core/utils/database";

export const config: PoolOptions = {
	uri: getEnv().PLAN_MYSQL_URI,
	connectionLimit: 10,
};
const database = createDatabase<DB>()({
  name: "Plan", dialect: "mysql", config,
})
export const planPool = database.pool
export const plan = database.connection
