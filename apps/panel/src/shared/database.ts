import { Kysely, PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import type { DB as authDBType } from "@repo/shared/types/db/general-database-types";
import { env } from "./env";
import { dbPoolHooks } from "./utils";

const { Pool } = pg;

const config: PoolConfig = {
	connectionString: env.GENERAL_POSTGRES_URI,
	max: 10,
};

export const generalPool = new Pool(config);
const opts = Bun.env.PROD ? {} : dbPoolHooks("General");

export const general = new Kysely<authDBType>({
	dialect: new PostgresDialect({
		pool: generalPool,
		...opts,
	}),
});
