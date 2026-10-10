import { createDatabase } from "@repo/core/utils/database";
import { getEnv } from "../env";
import type { PoolOptions as MySQLPoolConfig } from "mysql2";
import type { DB as skinsDb } from "@gen/db/skins";

const skinsDatabaseConfig: MySQLPoolConfig = {
	uri: getEnv().SKINS_MYSQL_URI,
	connectionLimit: 10,
};
const skinsDatabase = createDatabase<skinsDb>()({
	name: "Skins",
	dialect: "mysql",
	config: skinsDatabaseConfig,
});
export const skins = skinsDatabase.connection;
export const skinsPool = skinsDatabase.pool;
