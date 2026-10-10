import type { PoolConfig as PostgresPoolConfig } from "pg";
import type { DB as generalDb } from "@gen/db/general";
import { getEnv } from "../env";
import { createDatabase } from "@repo/core/utils/database";

const generalDatabaseConfig: PostgresPoolConfig = {
	connectionString: getEnv().GENERAL_POSTGRES_URI,
	max: 10,
};
const generalDatabase = createDatabase<generalDb>()({
	name: "General",
	dialect: "postgresql",
	config: generalDatabaseConfig,
});
export const generalPool = generalDatabase.pool;
export const general = generalDatabase.connection;
