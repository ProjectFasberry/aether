import type { DB } from "@gen/db/reputation";
import type { Pool, PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";
import { applyMySqlQueryTimeout, DB_CONNECT_TIMEOUT_MS, DB_POOL_QUEUE_LIMIT } from "./timeouts";

const config: PoolOptions = {
  uri: getEnv().REPUTATION_MYSQL_URI,
  connectionLimit: 10,
  connectTimeout: DB_CONNECT_TIMEOUT_MS,
  waitForConnections: true,
  queueLimit: DB_POOL_QUEUE_LIMIT
}
const database = createDatabase<DB>()({
  name: "Reputation", dialect: "mysql", config,
})
applyMySqlQueryTimeout(database.pool);
export const reputationPool: Pool = database.pool
export const reputation = database.connection
