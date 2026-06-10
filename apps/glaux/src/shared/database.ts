import type { PoolConfig as PostgresPoolConfig } from "pg";
import type { PoolOptions as MySQLPoolConfig } from "mysql2";
import type { DB as generalDb } from "@repo/shared/types/db/general";
import type { DB as skinsDb } from "@repo/shared/types/db/skins";
import { env } from "./env";
import { createDatabase, type DatabaseItem } from "@repo/core/utils/database";

const generalDatabaseConfig: PostgresPoolConfig = {
	connectionString: env.GENERAL_POSTGRES_URI,
	max: 10,
};
const generalDatabase = createDatabase<generalDb>()({
	name: "General",
	dialect: "postgresql",
	config: generalDatabaseConfig,
});
export const generalPool = generalDatabase.pool;
export const general = generalDatabase.connection;

const skinsDatabaseConfig: MySQLPoolConfig = {
	uri: env.SKINS_MYSQL_URI,
	connectionLimit: 10,
};
const skinsDatabase = createDatabase<skinsDb>()({
	name: "Skins",
	dialect: "mysql",
	config: skinsDatabaseConfig,
});
export const skins = skinsDatabase.connection;
export const skinsPool = skinsDatabase.pool;

export const DATABASES_FOR_CHECK: Record<string, DatabaseItem> = {
	general: { pool: generalPool, dialect: "postgres" },
	skins: { pool: skinsPool, dialect: "mysql" },
};
