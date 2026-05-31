import type { DB as bisquiteDBType } from "@repo/shared/types/db/bisquite";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { env } from "../env";

const config: PoolOptions = {
  uri: env.BISQUITE_MYSQL_URI,
  connectionLimit: 10,
}

export const bisquitePool: Pool = createPool(config)
const opts = poolOptsHooks("Bisquite")

export const bisquite = new Kysely<bisquiteDBType>({
  dialect: new MysqlDialect({
    pool: bisquitePool,
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
