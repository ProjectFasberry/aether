/** Shared pool limits; overridable per deployment without a schema change */
const positive = (name: string, fallback: number): number => {
  const value = Number(Bun.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const DB_CONNECT_TIMEOUT_MS = positive("DB_CONNECT_TIMEOUT_MS", 5_000);
export const DB_QUERY_TIMEOUT_MS = positive("DB_QUERY_TIMEOUT_MS", 15_000);
export const DB_POOL_QUEUE_LIMIT = positive("DB_POOL_QUEUE_LIMIT", 100);

type ConnectionPool = {
  on: (event: "connection", listener: (connection: any) => void) => unknown;
};

/** MySQL/MariaDB have different session variables; try both and ignore the unknown one. */
export function applyMySqlQueryTimeout(pool: ConnectionPool): void {
  pool.on("connection", (connection) => {
    connection.query(`SET SESSION max_statement_time = ${DB_QUERY_TIMEOUT_MS / 1000}`, () => undefined);
    connection.query(`SET SESSION max_execution_time = ${DB_QUERY_TIMEOUT_MS}`, () => undefined);
  });
}

/** MariaDB applies `max_statement_time` to every statement, in seconds */
export function applyMariaDbQueryTimeout(pool: ConnectionPool): void {
  pool.on("connection", (connection) => {
    connection.query(`SET SESSION max_statement_time = ${DB_QUERY_TIMEOUT_MS / 1000}`, () => undefined);
  });
}
