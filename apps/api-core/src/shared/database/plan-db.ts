import { env } from "../env";
import type { PoolOptions } from "mysql2";
import type { DB } from "@repo/shared/types/db/plan";
import { createDatabase } from "@repo/core/utils/database";

export const config: PoolOptions = {
	uri: env.PLAN_MYSQL_URI,
	connectionLimit: 10,
};
const database = createDatabase<DB>()({
  name: "Plan", dialect: "mysql", config,
})
export const planPool = database.pool
export const plan = database.connection
