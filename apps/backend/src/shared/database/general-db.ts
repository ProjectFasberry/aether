import { Kysely, PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import type { DB as authDBType } from "@repo/shared/types/db/auth-database-types";
import { poolOptsHooks } from "./lobby-db";
import { GENERAL_POSTGRES_URI as connectionString } from "../env";

const { Pool } = pg;

const config: PoolConfig = {
  connectionString,
  max: 10
}

export const generalPool = new Pool(config)

export const general = new Kysely<authDBType>({
  dialect: new PostgresDialect({
    pool: generalPool,
    ...poolOptsHooks("General")
  })
})