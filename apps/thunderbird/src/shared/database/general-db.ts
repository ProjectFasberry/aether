import type pg from "pg";
import type { DB } from "@gen/db/general";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: pg.PoolConfig = {
  connectionString: getEnv().GENERAL_POSTGRES_URI,
  max: 10,
};
const database = createDatabase<DB>()({
  name: "General", dialect: "postgresql", config,
})
export const general = database.connection
export const generalPool = database.pool
