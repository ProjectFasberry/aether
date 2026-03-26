import { Kysely } from 'kysely';
import type { DB as lpDBType } from "@repo/shared/types/db/luckperms-database-types";
import { PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import { poolOptsHooks } from './lobby-db';
import { LUCKPERMS_POSTGRES_URI as connectionString } from '../env';

const { Pool } = pg;

const config: PoolConfig = {
  connectionString,
  max: 10
}

export const luckpermsPool = new Pool(config)

export const luckperms = new Kysely<lpDBType>({
  dialect: new PostgresDialect({
    pool: luckpermsPool,
    ...poolOptsHooks("Luckperms")
  })
});