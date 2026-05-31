import type { Pool as MySQLPool } from "mysql2";
import type { Pool as PGPool, PoolClient as PGClient } from "pg";

export type SupportedPools = MySQLPool | PGPool;

export const isMySQLPool = (pool: SupportedPools): pool is MySQLPool => typeof (pool as MySQLPool).getConnection === "function";
export const isPGPool = (pool: SupportedPools): pool is PGPool => typeof (pool as PGPool).connect === "function";
