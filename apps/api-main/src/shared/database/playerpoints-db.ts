import type { DB as playerPointsDBType } from "@repo/shared/types/db/playerpoints";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { env } from "../env";

const config: PoolOptions = {
  uri: env.PLAYERPOINTS_MYSQL_URI,
  connectionLimit: 10
}

export const playerPointsPool: Pool = createPool(config)
const opts = poolOptsHooks("Playerpoints")

export const playerpoints = new Kysely<playerPointsDBType>({
  dialect: new MysqlDialect({
    pool: playerPointsPool,
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
