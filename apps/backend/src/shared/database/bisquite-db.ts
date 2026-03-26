import type { DB as bisquiteDBType } from "@repo/shared/types/db/bisquite-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { BISQUITE_MYSQL_URI as uri } from "../env";

const config: PoolOptions = {
  uri,
  connectionLimit: 10,
}

export const bisquitePool: Pool = createPool(config)

export const bisquite = new Kysely<bisquiteDBType>({
  dialect: new MysqlDialect({
    pool: bisquitePool,
    ...poolOptsHooks("Bisquite")
  })
});