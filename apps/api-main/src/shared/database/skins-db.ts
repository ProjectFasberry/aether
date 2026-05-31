import type { DB as skinsDBType } from "@repo/shared/types/db/skins";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { env } from "../env";

const config: PoolOptions = {
  uri: env.SKINS_MYSQL_URI,
  connectionLimit: 10
}

export const skinsPool: Pool = createPool(config)
const opts = poolOptsHooks("Skins")

export const skins = new Kysely<skinsDBType>({
  dialect: new MysqlDialect({
    pool: skinsPool,
    ...opts.hooks
  }),
  log(event) {
    if (event.level === "error") {
      opts.dbLogger.error("Query failed : ", {
        durationMs: event.queryDurationMillis,
        error: event.error,
        sql: event.query.sql
      });
    }
  }
});
