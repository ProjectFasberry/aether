import type { DB } from "@gen/db/reputation";
import type { Pool, PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolOptions = {
  uri: getEnv().REPUTATION_MYSQL_URI,
  connectionLimit: 10
}
const database = createDatabase<DB>()({
  name: "Reputation", dialect: "mysql", config,
})
export const reputationPool: Pool = database.pool
export const reputation = database.connection
