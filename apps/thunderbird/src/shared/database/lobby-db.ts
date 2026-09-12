import type { DB } from "@repo/shared/types/db/lobby";
import type { PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database"

const config: PoolOptions = {
  uri: getEnv().LOBBY_MYSQL_URI,
  connectionLimit: 10,
};
const database = createDatabase<DB>()({
  name: "Lobby", dialect: "mysql", config
})
export const lobbyPool = database.pool
export const lobby = database.connection
