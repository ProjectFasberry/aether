import type { DB } from "@repo/shared/types/db/luckperms";
import type { PoolConfig } from "pg";
import { getEnv } from '../env';
import { createDatabase } from '@repo/core/utils/database';

const config: PoolConfig = {
  connectionString: getEnv().LUCKPERMS_POSTGRES_URI,
  max: 10
}
const database = createDatabase<DB>()({
  name: "Luckperms", dialect: "postgresql", config
})
export const luckpermsPool = database.pool
export const luckperms = database.connection
