import { createPool, Pool, PoolOptions } from "mysql2";
import { PLAN_MYSQL_URI as uri } from "../env";
import { Kysely, MysqlDialect } from "kysely";
import type { DB as planDBType } from "@repo/shared/types/db/plan-database-types";
import { poolOptsHooks } from "./lobby-db";

export const config: PoolOptions = {
  uri,
  connectionLimit: 10
}

export const planPool: Pool = createPool(config)

export const plan = new Kysely<planDBType>({
  dialect: new MysqlDialect({
    pool: planPool,
    ...poolOptsHooks("Plan")
  })
});