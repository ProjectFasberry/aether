import type { Pool as MySQLPool } from "mysql2";
import type { PoolClient as PGClient } from "pg";
import { generalPool, skinsPool } from "./database";
import { appLogger } from "./logger";
import { isMySQLPool, isPGPool, type SupportedPools } from "@repo/shared/utils/index";

interface HealthCheckResult {
  name: string;
  type: "mysql" | "postgre" | "unknown";
  healthy: boolean;
  error?: unknown;
}

function checkMySQLHealth(pool: MySQLPool): Promise<void> {
  return new Promise((resolve, reject) => {
    pool.getConnection((poolErr, conn) => {
      if (poolErr) return reject(poolErr);
      conn.query("SELECT 1", (queryErr) => {
        pool.releaseConnection(conn);
        if (queryErr) return reject(queryErr);
        resolve();
      });
    });
  });
}

export async function checkDatabasesHealth(): Promise<void> {
  const results: HealthCheckResult[] = [];

  const DATABASES_FOR_CHECK: Record<string, SupportedPools> = {
    general: generalPool,
    skins: skinsPool
  };

  for (const [name, pool] of Object.entries(DATABASES_FOR_CHECK)) {
    const result: HealthCheckResult = { name, type: "unknown", healthy: false };

    try {
      if (isMySQLPool(pool)) {
        result.type = "mysql";

        try {
          await checkMySQLHealth(pool);
          result.healthy = true;
        } catch (err) {
          result.error = err;
        }
      } else if (isPGPool(pool)) {
        result.type = "postgre";

        const conn: PGClient = await pool.connect();

        try {
          await conn.query("SELECT NOW()");
          result.healthy = true;
        } finally {
          conn.release();
        }
      } else {
        result.error = new Error("Unsupported pool type");
      }
    } catch (e) {
      result.error = e;
    }

    results.push(result);
  }

  results.forEach(({ name, type, healthy, error }) => {
    if (healthy) {
      appLogger.success(`Database '${name}' (${type}) is healthy`);
    } else {
      appLogger.error(`Database '${name}' (${type}) failed`, error);
      process.exit(1);
    }
  });
}
