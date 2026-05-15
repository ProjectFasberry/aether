import type { DB as libertyBansDBType } from "@repo/shared/types/db/libertybans-database-types";
import { Kysely, PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import { poolOptsHooks } from "./lobby-db";
import { env } from "../env";

const { Pool } = pg;

const config: PoolConfig = {
  connectionString: env.LIBERTYBANS_POSTGRES_URI,
  max: 10
}

export const libertybansPool = new Pool(config)
const opts = poolOptsHooks("Libertybans") 

export const libertybans = new Kysely<libertyBansDBType>({
  dialect: new PostgresDialect({
    pool: libertybansPool,
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