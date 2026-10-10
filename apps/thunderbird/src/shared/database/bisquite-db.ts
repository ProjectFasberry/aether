import type { DB } from "@gen/db/bisquite";
import type { PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolOptions = {
  uri: getEnv().BISQUITE_MYSQL_URI,
  connectionLimit: 10,
}
const database = createDatabase<DB>()({
  name: "bisquite", dialect: "mariadb", config: getEnv().BISQUITE_MYSQL_URI,
})
export const bisquitePool = database.pool
export const bisquite = database.connection
