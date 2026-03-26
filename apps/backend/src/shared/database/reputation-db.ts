import type { DB as reputationDBType } from "@repo/shared/types/db/reputation-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { REPUTATION_MYSQL_URI as uri } from "../env";

const config: PoolOptions = {
  uri,
  connectionLimit: 10
}

export const reputationPool: Pool = createPool(config)

export const reputation = new Kysely<reputationDBType>({
  dialect: new MysqlDialect({
    pool: reputationPool,
    ...poolOptsHooks("Reputation")
  })
});