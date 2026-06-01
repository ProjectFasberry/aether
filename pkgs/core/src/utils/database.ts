import { Kysely, MysqlDialect, PostgresDialect } from "kysely";
import { type PoolConfig as PostgresPoolConfig, Pool as PostgresPool } from "pg";
import { type PoolOptions as MysqlPoolConfig, createPool as createMysqlPool, type Pool as MySQLPool } from "mysql2";
import consola from "consola";

type DialectTarget = "postgresql" | "mysql";

type CreateDatabaseOptions<T> = {
  name: string;
  config: T;
};

function getPoolOptions(name: string) {
  const dbLogger = consola.withTag("database").withTag(name.toLowerCase());

  return {
    dbLogger,
    hooks: process.env.NODE_ENV === 'production' ? {} : {
      onCreateConnection: async () => dbLogger.info(`New connection established`),
      onDestroyConnection: async () => dbLogger.warn(`Connection destroyed`),
    }
  };
};

function createLogger(dbLogger: typeof consola) {
  return (event: any) => {
    if (event.level === "error") {
      dbLogger.error("Query failed : ", {
        durationMs: event.queryDurationMillis,
        error: event.error,
        sql: event.query.sql
      });
    }
  };
}

export function createDatabase<TSchema>() {
  function impl(options: { dialect: "postgresql" } & CreateDatabaseOptions<PostgresPoolConfig>): {
    connection: Kysely<TSchema>;
    pool: PostgresPool;
  };
  function impl(options: { dialect: "mysql" } & CreateDatabaseOptions<MysqlPoolConfig>): {
    connection: Kysely<TSchema>;
    pool: MySQLPool;
  };
  function impl({ name, dialect, config }: { dialect: DialectTarget, name: string, config: any }) {
    const opts = getPoolOptions(name);

    if (dialect === 'postgresql') {
      const pool = new PostgresPool(config);

      return {
        connection: new Kysely<TSchema>({
          dialect: new PostgresDialect({
            pool,
            ...opts.hooks
          }),
          log: createLogger(opts.dbLogger)
        }),
        pool
      };
    } else {
      const pool = createMysqlPool(config);

      return {
        connection: new Kysely<TSchema>({
          dialect: new MysqlDialect({
            pool,
            ...opts.hooks
          }),
          log: createLogger(opts.dbLogger)
        }),
        pool
      };
    }
  }

  return impl;
}
