import { Kysely } from 'kysely';
import type { DB as lpDBType } from "@repo/shared/types/db/luckperms-database-types";
import { PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import { poolOptsHooks } from './lobby-db';
import { env } from '../env';

const { Pool } = pg;

const config: PoolConfig = {
  connectionString: env.LUCKPERMS_POSTGRES_URI,
  max: 10
}

export const luckpermsPool = new Pool(config)
const opts = poolOptsHooks("Luckperms")

export const luckperms = new Kysely<lpDBType>({
  dialect: new PostgresDialect({
    pool: luckpermsPool,
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