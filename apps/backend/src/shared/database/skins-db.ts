import type { DB as skinsDBType } from "@repo/shared/types/db/skins-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { SKINS_MYSQL_URI as uri } from "../env";

const config: PoolOptions = {
  uri,
  connectionLimit: 10
}

export const skinsPool: Pool = createPool(config)

export const skins = new Kysely<skinsDBType>({
  dialect: new MysqlDialect({
    pool: skinsPool,
    ...poolOptsHooks("Skins")
  })
});