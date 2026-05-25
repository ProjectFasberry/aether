import type { DB as reputationDBType } from "@repo/shared/types/db/reputation-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { env } from "../env";

const config: PoolOptions = {
  uri: env.REPUTATION_MYSQL_URI,
  connectionLimit: 10
}

export const reputationPool: Pool = createPool(config)
const opts = poolOptsHooks("Reputation")

export const reputation = new Kysely<reputationDBType>({
  dialect: new MysqlDialect({
    pool: reputationPool,
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