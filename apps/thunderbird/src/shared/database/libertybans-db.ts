import type { DB } from "@repo/shared/types/db/libertybans";
import type { PoolConfig } from "pg";
import { env } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const config: PoolConfig = {
  connectionString: env.LIBERTYBANS_POSTGRES_URI,
  max: 10
}
const database = createDatabase<DB>()({
  name: "Libertybans", dialect: "postgresql", config
})
export const libertybans = database.connection
export const libertybansPool =database.pool
