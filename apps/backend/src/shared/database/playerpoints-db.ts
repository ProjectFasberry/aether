import type { DB as playerPointsDBType } from "@repo/shared/types/db/player-points-database-types";
import { Kysely } from "kysely";
import { MysqlDialect } from "kysely";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { poolOptsHooks } from "./lobby-db";
import { PLAYERPOINTS_MYSQL_URI as uri } from "../env";

const config: PoolOptions = {
  uri,
  connectionLimit: 10
}

export const playerPointsPool: Pool = createPool(config)

export const playerpoints = new Kysely<playerPointsDBType>({
  dialect: new MysqlDialect({
    pool: playerPointsPool,
    ...poolOptsHooks("Playerpoints")
  })
});