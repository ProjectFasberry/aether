import { bisquitePool } from "./bisquite-db";
import { lobbyPool } from "./lobby-db";
import { luckpermsPool } from "./luckperms-db";
import { generalPool } from "./general-db";
import { reputationPool } from "./reputation-db";
import { skinsPool } from "./skins-db";
import { playerPointsPool } from "./playerpoints-db";
import type { Pool as MySQLPool } from "mysql2";
import type { Pool as PGPool, PoolClient as PGClient } from "pg";
import { libertybansPool } from "./libertybans-db";
import { appLogger } from "#/utils/config/logger";
import { planPool } from "./plan-db";

type SupportedPools = MySQLPool | PGPool;

interface HealthCheckResult {
	name: string;
	type: "mysql" | "postgre" | "unknown";
	healthy: boolean;
	error?: unknown;
}

function isMySQLPool(pool: SupportedPools): pool is MySQLPool {
	return typeof (pool as MySQLPool).getConnection === "function";
}

function isPGPool(pool: SupportedPools): pool is PGPool {
	return typeof (pool as PGPool).connect === "function";
}

const DATABASES_FOR_CHECK: Record<string, SupportedPools> = {
	bisquite: bisquitePool,
	lobby: lobbyPool,
	luckperms: luckpermsPool,
	general: generalPool,
	reputation: reputationPool,
	skins: skinsPool,
	playerpoints: playerPointsPool,
	libertybans: libertybansPool,
	plan: planPool,
};

function checkMySQLHealth(pool: MySQLPool): Promise<void> {
	return new Promise((resolve, reject) => {
		pool.getConnection((poolErr, conn) => {
			if (poolErr) return reject(poolErr);
			conn.query("SELECT 1", (queryErr) => {
				pool.releaseConnection(conn);
				if (queryErr) return reject(queryErr);
				resolve();
			});
		});
	});
}

export async function checkDatabasesHealth(): Promise<HealthCheckResult[]> {
	const results: HealthCheckResult[] = [];

	for (const [name, pool] of Object.entries(DATABASES_FOR_CHECK)) {
		const result: HealthCheckResult = { name, type: "unknown", healthy: false };

		try {
			if (isMySQLPool(pool)) {
				result.type = "mysql";

				try {
					await checkMySQLHealth(pool);
					result.healthy = true;
				} catch (err) {
					result.error = err;
				}
			} else if (isPGPool(pool)) {
				result.type = "postgre";

				const conn: PGClient = await pool.connect();

				try {
					await conn.query("SELECT NOW()");
					result.healthy = true;
				} finally {
					conn.release();
				}
			} else {
				result.error = new Error("Unsupported pool type");
			}
		} catch (e) {
			result.error = e;
		}

		results.push(result);
	}

	results.forEach(({ name, type, healthy, error }) => {
		if (healthy) {
			appLogger.success(`Database '${name}' (${type}) is healthy`);
		} else {
			appLogger.error(`Database '${name}' (${type}) failed`, error);
			process.exit(1);
		}
	});

	return results
}
