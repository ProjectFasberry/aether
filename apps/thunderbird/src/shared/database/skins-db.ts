import type { DB } from "@gen/db/skins";
import type { PoolOptions } from "mysql2";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolOptions = {
  uri: getEnv().SKINS_MYSQL_URI,
  connectionLimit: 10
}
const database = createDatabase<DB>()({
  name: "Skins", dialect: "mysql", config,
})
export const skinsPool = database.pool
export const skins = database.connection
