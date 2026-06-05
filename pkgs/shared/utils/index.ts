import type { Pool as MySQLPool } from "mysql2";
import type { Pool as PGPool } from "pg";
import type { Pool as MariaDbPool } from "mariadb";

export type SupportedPools = MySQLPool | PGPool | MariaDbPool;
export type SupportedDialects = "mysql" | "postgres" | "mariadb";
