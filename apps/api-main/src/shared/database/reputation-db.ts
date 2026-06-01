import type { DB as reputationDBType } from "@repo/shared/types/db/reputation";
import type { Pool, PoolOptions } from "mysql2";
import { env } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolOptions = {
  uri: env.REPUTATION_MYSQL_URI,
  connectionLimit: 10
}
const database = createDatabase<reputationDBType>()({
  name: "Reputation", dialect: "mysql", config,
})
export const reputationPool: Pool = database.pool
export const reputation = database.connection
