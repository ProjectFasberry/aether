import { Kysely, PostgresDialect } from "kysely";
import pg, { type PoolConfig } from "pg";
import type { DB as authDBType } from "@repo/shared/types/db/general-database-types";
import { poolOptsHooks } from "./lobby-db";
import { GENERAL_POSTGRES_URI as connectionString } from "../env";

const { Pool } = pg;

const config: PoolConfig = {
	connectionString,
	max: 10,
};

export const generalPool = new Pool(config);

const PII_KEYS = ['password', 'email', 'phone', 'address'];

function maskPII(data: any): any {
	if (typeof data !== 'object' || data === null) return data;

	return Object.keys(data).reduce((acc, key) => {
		if (PII_KEYS.includes(key.toLowerCase())) {
			acc[key] = '********'; 
		} else if (typeof data[key] === 'object') {
			acc[key] = maskPII(data[key]); 
		} else {
			acc[key] = data[key];
		}
		return acc;
	}, Array.isArray(data) ? [] : {} as any);
}

export const general = new Kysely<authDBType>({
	dialect: new PostgresDialect({
		pool: generalPool,
		...poolOptsHooks("General"),
	}),
	log(event) {
		if (event.level === "error") {
			console.error("Query failed : ", {
				durationMs: event.queryDurationMillis,
				error: event.error,
				sql: event.query.sql,
				params: event.query.parameters.map(maskPII),
			});
		}
	}
});
