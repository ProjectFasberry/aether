import type pg from "pg";
import type { DB } from "@gen/db/grim";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";
import { DB_CONNECT_TIMEOUT_MS, DB_QUERY_TIMEOUT_MS } from "./timeouts";

/**
 * Anticheat flags live in their own database: they are high-volume, rotated
 * independently from the main data and must not slow down `general`.
 */
const config: pg.PoolConfig = {
  connectionString: getEnv().GRIM_POSTGRES_URI,
  max: 5,
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  statement_timeout: DB_QUERY_TIMEOUT_MS,
  query_timeout: DB_QUERY_TIMEOUT_MS,
};
const database = createDatabase<DB>()({
  name: "Grim", dialect: "postgresql", config,
})
export const grim = database.connection
export const grimPool = database.pool
