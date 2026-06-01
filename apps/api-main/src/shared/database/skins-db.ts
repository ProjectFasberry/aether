import type { DB } from "@repo/shared/types/db/skins";
import type { PoolOptions } from "mysql2";
import { env } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolOptions = {
  uri: env.SKINS_MYSQL_URI,
  connectionLimit: 10
}
const database = createDatabase<DB>()({
  name: "Skins", dialect: "mysql", config,
})
export const skinsPool = database.pool
export const skins = database.connection
