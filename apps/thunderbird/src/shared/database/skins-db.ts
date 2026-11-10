import type { DB } from "@gen/db/skins";
import type { PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";
import { applyMySqlQueryTimeout, DB_CONNECT_TIMEOUT_MS, DB_POOL_QUEUE_LIMIT } from "./timeouts";

const config: PoolOptions = {
  uri: getEnv().SKINS_MYSQL_URI,
  connectionLimit: 10,
  connectTimeout: DB_CONNECT_TIMEOUT_MS,
  waitForConnections: true,
  queueLimit: DB_POOL_QUEUE_LIMIT
}
const database = createDatabase<DB>()({
  name: "Skins", dialect: "mysql", config,
})
applyMySqlQueryTimeout(database.pool);
export const skinsPool = database.pool
export const skins = database.connection
