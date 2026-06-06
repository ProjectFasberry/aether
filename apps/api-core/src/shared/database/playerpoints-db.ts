import type { DB } from "@repo/shared/types/db/playerpoints";
import type { Pool, PoolOptions } from "mysql2";
import { env } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolOptions = {
  uri: env.PLAYERPOINTS_MYSQL_URI,
  connectionLimit: 10
}
const database = createDatabase<DB>()({
  name: "Playerpoints", dialect: "mysql", config,
})
export const playerPointsPool: Pool = database.pool
export const playerpoints = database.connection
