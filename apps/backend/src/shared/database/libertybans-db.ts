import type { DB as libertyBansDBType } from "@repo/shared/types/db/libertybans-database-types";
import { Kysely, PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import { poolOptsHooks } from "./lobby-db";
import { LIBERTYBANS_POSTGRES_URI as connectionString } from "../env";

const { Pool } = pg;

const config: PoolConfig = {
  connectionString,
  max: 10
}

export const libertybansPool = new Pool(config)

export const libertybans = new Kysely<libertyBansDBType>({
  dialect: new PostgresDialect({
    pool: libertybansPool,
    ...poolOptsHooks("Libertybans")
  })
});