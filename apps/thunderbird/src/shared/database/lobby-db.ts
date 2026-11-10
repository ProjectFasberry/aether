import type { DB } from "@gen/db/lobby";
import type { PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database"
import { applyMySqlQueryTimeout, DB_CONNECT_TIMEOUT_MS, DB_POOL_QUEUE_LIMIT } from "./timeouts";

const config: PoolOptions = {
  uri: getEnv().LOBBY_MYSQL_URI,
  connectionLimit: 10,
  connectTimeout: DB_CONNECT_TIMEOUT_MS,
  waitForConnections: true,
  queueLimit: DB_POOL_QUEUE_LIMIT,
};
const database = createDatabase<DB>()({
  name: "Lobby", dialect: "mysql", config
})
applyMySqlQueryTimeout(database.pool);
export const lobbyPool = database.pool
export const lobby = database.connection
