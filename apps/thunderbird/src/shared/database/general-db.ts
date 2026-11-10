import type pg from "pg";
import type { DB } from "@gen/db/general";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";
import { DB_CONNECT_TIMEOUT_MS, DB_QUERY_TIMEOUT_MS } from "./timeouts";

const config: pg.PoolConfig = {
  connectionString: getEnv().GENERAL_POSTGRES_URI,
  max: 10,
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  statement_timeout: DB_QUERY_TIMEOUT_MS,
  query_timeout: DB_QUERY_TIMEOUT_MS,
};
const database = createDatabase<DB>()({
  name: "General", dialect: "postgresql", config,
})
export const general = database.connection
export const generalPool = database.pool
