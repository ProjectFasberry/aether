import type { DB } from "@gen/db/luckperms";
import type { PoolConfig } from "pg";
import { getEnv } from '../env';
import { createDatabase } from '@repo/core/utils/database';
import { DB_CONNECT_TIMEOUT_MS, DB_QUERY_TIMEOUT_MS } from "./timeouts";

const config: PoolConfig = {
  connectionString: getEnv().LUCKPERMS_POSTGRES_URI,
  max: 10,
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  statement_timeout: DB_QUERY_TIMEOUT_MS,
  query_timeout: DB_QUERY_TIMEOUT_MS
}
const database = createDatabase<DB>()({
  name: "Luckperms", dialect: "postgresql", config
})
export const luckpermsPool = database.pool
export const luckperms = database.connection
