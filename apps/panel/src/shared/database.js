import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { GENERAL_POSTGRES_URI as connectionString } from "./env";
import { poolOptsHooks } from "./utils";
const { Pool } = pg;
const config = {
	connectionString,
	max: 10,
};
export const generalPool = new Pool(config);
export const general = new Kysely({
	dialect: new PostgresDialect({
		pool: generalPool,
		...poolOptsHooks("General"),
	}),
});
