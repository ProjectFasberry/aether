import type { DB } from "@gen/db/bisquite";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";
import { applyMariaDbQueryTimeout, DB_CONNECT_TIMEOUT_MS } from "./timeouts";

const config = {
  uri: getEnv().BISQUITE_MYSQL_URI,
  connectionLimit: 10,
  connectTimeout: DB_CONNECT_TIMEOUT_MS,
  acquireTimeout: DB_CONNECT_TIMEOUT_MS,
  idleTimeout: 60_000,
}

const database = createDatabase<DB>()({
  name: "bisquite", dialect: "mariadb", config,
})

applyMariaDbQueryTimeout(database.pool);
export const bisquitePool = database.pool
export const bisquite = database.connection
