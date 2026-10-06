import { Kysely, MysqlDialect, PostgresDialect } from "kysely";
import { MariadbDialect } from "kysely-mariadb";
import { type PoolConfig as PostgresPoolConfig, Pool as PGPool } from "pg";
import { type PoolOptions as MysqlPoolConfig, type Pool as MySQLPool, createPool as createMysqlPool, } from "mysql2";
import { type PoolConfig as MariadbPoolConfig, type Pool as MariadbPool, createPool as createMariadbPool } from "mariadb";
import { type Logger, logger } from "@repo/shared/utils/logger";
import { LogEvent } from "kysely";
import type { Pool as MariaDbPool } from "mariadb";

export type SupportedPools = MySQLPool | PGPool | MariaDbPool;
export type SupportedDialects = "mysql" | "postgres" | "mariadb";

type DialectTarget = "postgresql" | "mysql" | "mariadb";

type CreateDatabaseOptions<T> = {
  name: string;
  config: T;
};

function getPoolOptions(name: string): { logger: Logger, hooks: Record<string, () => Promise<void>> } {
  const localLogger = logger.child({ name: ["db", name.toLowerCase()] });

  return {
    logger: localLogger,
    hooks: process.env.NODE_ENV === 'production' ? {} : {
      onCreateConnection: async () => {
        localLogger.info(`New connection established`)
      },
      onDestroyConnection: async () => {
        localLogger.warn(`Connection destroyed`)
      },
    }
  };
};

const createLogger = (logger: Logger) => (event: LogEvent) => {
  if (event.level === "error") {
    const { queryDurationMillis, error, query } = event

    logger.error("Query failed: ", {
      durationMs: queryDurationMillis,
      error: error,
      sql: query.sql
    });
  }
};

type MariaDbUriConfig = {
  host: string;
  port: number;
  user?: string;
  password?: string;
  database?: string;
  params?: { [key: string]: string };
}

function parseMariaDbUri(uri: string): MariaDbUriConfig {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'mariadb:' && parsed.protocol !== 'mysql:') {
    throw new Error(`Invalid protocol: ${parsed.protocol}. Expected mariadb:// or mysql://`);
  }
  const config: MariaDbUriConfig = {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? parseInt(parsed.port, 10) : 3306,
  };
  if (parsed.username) {
    config.user = decodeURIComponent(parsed.username);
  }
  if (parsed.password) {
    config.password = decodeURIComponent(parsed.password);
  }
  if (parsed.pathname && parsed.pathname !== '/') {
    config.database = decodeURIComponent(parsed.pathname.substring(1));
  }
  if (parsed.searchParams.size > 0) {
    config.params = {};
    parsed.searchParams.forEach((value, key) => {
      config.params![key] = value;
    });
  }
  return config;
}

export function createDatabase<TSchema>() {
  function impl(options: { dialect: "postgresql" } & CreateDatabaseOptions<PostgresPoolConfig>): {
    connection: Kysely<TSchema>;
    pool: PGPool;
  };
  function impl(options: { dialect: "mysql" } & CreateDatabaseOptions<MysqlPoolConfig>): {
    connection: Kysely<TSchema>;
    pool: MySQLPool;
  };
  function impl(options: { dialect: "mariadb" } & CreateDatabaseOptions<MariadbPoolConfig | string>): {
    connection: Kysely<TSchema>;
    pool: MariadbPool;
  };
  function impl({ name, dialect, config }: { dialect: DialectTarget, name: string, config: any }) {
    const opts = getPoolOptions(name);

    if (dialect === 'mariadb') {
      const { host, port, database, user, password } = parseMariaDbUri(config);

      const pool = createMariadbPool({
        host, port, database, user, password
      });

      return {
        connection: new Kysely<TSchema>({
          dialect: new MariadbDialect({
            mariadb: pool,
          }),
          log: createLogger(opts.logger)
        }),
        pool
      }
    }

    if (dialect === 'postgresql') {
      const pool = new PGPool(config);

      return {
        connection: new Kysely<TSchema>({
          dialect: new PostgresDialect({
            pool,
            ...opts.hooks
          }),
          log: createLogger(opts.logger)
        }),
        pool
      };
    }

    if (dialect === 'mysql') {
      const pool = createMysqlPool(config);

      return {
        connection: new Kysely<TSchema>({
          dialect: new MysqlDialect({
            pool,
            ...opts.hooks
          }),
          log: createLogger(opts.logger)
        }),
        pool
      };
    }
  }

  return impl;
}

export type HealthCheckResult = {
  error?: unknown;
  name: string;
  dialect: SupportedDialects
  healthy: boolean;
}

const checks = {
  mysql: (pool: MySQLPool): Promise<void> => {
    return new Promise((resolve, reject) => {
      pool.getConnection((poolErr, conn) => {
        if (poolErr) {
          return reject(poolErr);
        }

        conn.query("SELECT 1", (queryErr) => {
          conn.release();

          if (queryErr) {
            return reject(queryErr);
          }

          resolve();
        });
      });
    });
  },
  postgres: async (pool: PGPool): Promise<void> => {
    const conn = await pool.connect();
    try {
      await conn.query("SELECT NOW()");
    } finally {
      conn.release()
    }
  },
  mariadb: async (pool: MariadbPool): Promise<void> => {
    const conn = await pool.getConnection()
    try {
      await conn.query("SELECT 1")
    } finally {
      conn.release()
    }
  }
}

export type DatabaseItem = { dialect: SupportedDialects, pool: SupportedPools }

function isNetworkError(error: any): boolean {
  const networkCodes = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ENOTFOUND', 'EPIPE']);
  if (error?.code && networkCodes.has(String(error.code))) return true;

  const msg = error?.message?.toLowerCase() || '';
  return msg.includes('connection') || msg.includes('timeout') || msg.includes('refused');
}
export async function checkDatabasesHealth(databases: Record<string, DatabaseItem>, {
  onError: onFailure,
  onSuccess,
  verbose = false
}: {
  onSuccess?: (results: HealthCheckResult[]) => void,
  onError?: (error: unknown) => void,
  verbose?: boolean
}): Promise<void> {
  const results: HealthCheckResult[] = [];
  const dbLogger = (name: string) => logger.child({ name: ["db", name] })

  try {
    for (const [name, { pool, dialect }] of Object.entries(databases)) {
      verbose && dbLogger(name).info(`Starting health check (${dialect})`)

      const result: Omit<HealthCheckResult, "name"> = { healthy: false, dialect }

      try {
        const cb = checks[dialect]
        if (!cb) {
          throw new ReferenceError(`No health check callback for dialect ${dialect}`);
        }

        // @ts-expect-error
        await cb(pool);
        result.healthy = true;

        verbose && dbLogger(name).info(`Is healthy`);
      } catch (e) {
        if (e instanceof TypeError || e instanceof ReferenceError || !isNetworkError(e)) {
          throw e;
        }

        result.healthy = false;
        result.error = e

        verbose && dbLogger(name).error(`Failed (Network/Instance unavailable)`);
      }

      results.push({ ...result, name })
    }

    onSuccess?.(results)
  } catch (e) {
    onFailure?.(e);
  }
}

export const printDatabases = (results: HealthCheckResult[]) => {
  const dbsStr = results.map((r) => `${r.name} (${r.dialect})`).join("\n")
  logger.info(dbsStr, { asBox: true, title: "Databases" })
}
