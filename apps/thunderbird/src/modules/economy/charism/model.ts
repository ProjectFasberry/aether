import { getEnv } from "#/shared/env";
import { getBalance as getWalletBalance } from "#/modules/economy/wallet.model";
import { createDatabase } from "@repo/core/utils/database";
import { applyMariaDbQueryTimeout, DB_CONNECT_TIMEOUT_MS } from "#/shared/database/timeouts";
import type { DB as bisquiteDB } from "@gen/db/bisquite";
import type { Kysely } from "kysely";
import { createCharismRegistry, type CharismProvider } from "./contract";

/**
 * Bisquite is the live server: charisma moves through the ledger and the
 * projection writes `cmi_users`.
 */
const bisquiteProvider: CharismProvider = {
	server: "bisquite",
	title: "Bisquite",
	available: () => true,
	purchasable: () => true,
	getBalance: (nickname) => getWalletBalance(nickname, "CHARISM"),
};

let muffinConnection: Kysely<bisquiteDB> | null = null;

/**
 * Muffin is opt-in. As soon as `MUFFIN_MYSQL_URI` points at a CMI-compatible
 * database, balances become readable; spending stays off until the wallet is
 * keyed per server, so the store keeps charging Bisquite.
 */
function muffinDb(): Kysely<bisquiteDB> | null {
	const uri = getEnv().MUFFIN_MYSQL_URI;
	if (!uri) return null;

	if (!muffinConnection) {
		const database = createDatabase<bisquiteDB>()({
			name: "muffin",
			dialect: "mariadb",
			config: {
				uri,
				connectionLimit: 10,
				connectTimeout: DB_CONNECT_TIMEOUT_MS,
				acquireTimeout: DB_CONNECT_TIMEOUT_MS,
			},
		});
		applyMariaDbQueryTimeout(database.pool);
		muffinConnection = database.connection;
	}

	return muffinConnection;
}

const muffinProvider: CharismProvider = {
	server: "muffin",
	title: "Muffin",
	available: () => Boolean(getEnv().MUFFIN_MYSQL_URI),
	// The wallet still has one global CHARISM balance; enable after the
	// per-server wallet migration.
	purchasable: () => false,
	async getBalance(nickname) {
		const db = muffinDb();
		if (!db) return null;

		const row = await db
			.selectFrom("cmi_users")
			.select("Balance as balance")
			.where("username", "=", nickname)
			.executeTakeFirst();

		return Math.round(Number(row?.balance ?? 0));
	},
};

export const charism = createCharismRegistry([bisquiteProvider, muffinProvider]);
