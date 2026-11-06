import { general } from "#/shared/database/general-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { bisquite } from "#/shared/database/bisquite-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { appLogger } from "#/shared/constants/logger";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";
import { sql } from "kysely";

const db = general as unknown as Kysely<DB & {
	wallets: any;
	ledger_entries: any;
	grant_jobs: any;
	orders: any;
}>;

export type BalanceMismatch = {
	nickname: string;
	currency: string;
	wallet: number;
	plugin: number;
	delta: number;
};

export type ReconciliationReport = {
	at: Date;
	checked: number;
	mismatchCount: number;
	missingPlugin: number;
	pendingProjection: number;
	mismatches: BalanceMismatch[];
};

type WalletRow = { nickname: string; currency: string; balance: number };

async function pluginBalances(): Promise<Map<string, number>> {
	const [belkoin, charism] = await Promise.all([
		playerpoints
			.selectFrom("playerpoints_username_cache as cache")
			.innerJoin("playerpoints_points as points", "points.uuid", "cache.uuid")
			.select(["cache.username as nickname", "points.points as balance"])
			.execute(),
		bisquite
			.selectFrom("cmi_users")
			.select(["username as nickname", "Balance as balance"])
			.where("username", "is not", null)
			.execute(),
	]);

	const map = new Map<string, number>();

	for (const row of belkoin) {
		map.set(`BELKOIN:${row.nickname.toLowerCase()}`, Math.round(Number(row.balance ?? 0)));
	}

	for (const row of charism) {
		if (!row.nickname) continue;
		map.set(`CHARISM:${String(row.nickname).toLowerCase()}`, Math.round(Number(row.balance ?? 0)));
	}

	return map;
}

async function pendingProjections(): Promise<Set<string>> {
	const jobs = await db
		.selectFrom("grant_jobs")
		.select("payload")
		.where("status", "=", "pending")
		.execute() as unknown as { payload: { nickname?: string; currency?: string } }[];

	return new Set(jobs
		.filter((job) => job.payload?.nickname && job.payload?.currency)
		.map((job) => `${job.payload.currency}:${String(job.payload.nickname).toLowerCase()}`));
}

/**
 * Compares every wallet with the plugin table the game servers read. The
 * plugin is still the delivery target, so a difference means the projection is
 * behind (queued) or the ledger and the plugin disagree.
 */
export async function reconcileBalances({ limit = 5_000 } = {}): Promise<ReconciliationReport> {
	const [wallets, plugin, pending] = await Promise.all([
		db
			.selectFrom("wallets")
			.select(["nickname", "currency", "balance"])
			.orderBy("nickname", "asc")
			.limit(limit)
			.execute() as unknown as Promise<WalletRow[]>,
		pluginBalances(),
		pendingProjections(),
	]);

	const mismatches: BalanceMismatch[] = [];
	let missingPlugin = 0;
	let pendingProjection = 0;

	for (const wallet of wallets) {
		const key = `${wallet.currency}:${wallet.nickname.toLowerCase()}`;
		const walletBalance = Number(wallet.balance);
		const pluginBalance = plugin.get(key);

		if (pluginBalance === undefined) {
			if (pending.has(key)) {
				pendingProjection += 1;
				continue;
			}

			missingPlugin += 1;
			continue;
		}

		if (pluginBalance === walletBalance) continue;

		if (pending.has(key)) {
			pendingProjection += 1;
			continue;
		}

		mismatches.push({
			nickname: wallet.nickname,
			currency: wallet.currency,
			wallet: walletBalance,
			plugin: pluginBalance,
			delta: walletBalance - pluginBalance,
		});
	}

	return {
		at: new Date(),
		checked: wallets.length,
		mismatchCount: mismatches.length,
		missingPlugin,
		pendingProjection,
		mismatches: mismatches.slice(0, 100),
	};
}

export type GrantJobsReport = {
	pending: number;
	failed: number;
	stuck: number;
	oldestPendingAt: Date | null;
	failedSamples: { orderId: string; kind: string; error: string | null; attempts: number }[];
};

export async function grantJobsReport(): Promise<GrantJobsReport> {
	const stuckBefore = new Date(Date.now() - 60 * 60 * 1000);

	const [pending, failed, stuck, oldest, samples] = await Promise.all([
		db.selectFrom("grant_jobs").select((eb: any) => eb.fn.countAll().as("count")).where("status", "=", "pending").executeTakeFirst(),
		db.selectFrom("grant_jobs").select((eb: any) => eb.fn.countAll().as("count")).where("status", "=", "failed").executeTakeFirst(),
		db.selectFrom("grant_jobs")
			.select((eb: any) => eb.fn.countAll().as("count"))
			.where("status", "=", "pending")
			.where("run_after", "<", stuckBefore)
			.executeTakeFirst(),
		db.selectFrom("grant_jobs")
			.select("created_at")
			.where("status", "=", "pending")
			.orderBy("created_at", "asc")
			.limit(1)
			.executeTakeFirst() as unknown as Promise<{ created_at: Date } | undefined>,
		db.selectFrom("grant_jobs")
			.select(["order_id", "kind", "last_error", "attempts"])
			.where("status", "=", "failed")
			.orderBy("id", "desc")
			.limit(10)
			.execute() as unknown as Promise<{ order_id: string; kind: string; last_error: string | null; attempts: number }[]>,
	]);

	return {
		pending: Number((pending as { count?: number | string } | undefined)?.count ?? 0),
		failed: Number((failed as { count?: number | string } | undefined)?.count ?? 0),
		stuck: Number((stuck as { count?: number | string } | undefined)?.count ?? 0),
		oldestPendingAt: oldest?.created_at ?? null,
		failedSamples: samples.map((row) => ({
			orderId: row.order_id,
			kind: row.kind,
			error: row.last_error,
			attempts: Number(row.attempts),
		})),
	};
}

export type FlowRow = {
	currency: string;
	reason: string;
	inflow: number;
	outflow: number;
	net: number;
	operations: number;
};

export type FaucetSinkReport = {
	from: Date;
	to: Date;
	rows: FlowRow[];
	totals: Record<string, { inflow: number; outflow: number; net: number }>;
};

export async function faucetSinkReport({
	from,
	to,
}: {
	from: Date;
	to: Date;
}): Promise<FaucetSinkReport> {
	const rows = await db
		.selectFrom("ledger_entries")
		.select([
			"currency",
			"reason",
			sql<string>`sum(case when delta > 0 then delta else 0 end)`.as("inflow"),
			sql<string>`sum(case when delta < 0 then -delta else 0 end)`.as("outflow"),
			sql<string>`sum(delta)`.as("net"),
			sql<string>`count(*)`.as("operations"),
		])
		.where("created_at", ">=", from)
		.where("created_at", "<", to)
		.groupBy(["currency", "reason"])
		.orderBy("currency", "asc")
		.orderBy("reason", "asc")
		.execute() as unknown as Record<string, string>[];

	const flows: FlowRow[] = rows.map((row) => ({
		currency: row.currency,
		reason: row.reason,
		inflow: Number(row.inflow),
		outflow: Number(row.outflow),
		net: Number(row.net),
		operations: Number(row.operations),
	}));

	const totals: FaucetSinkReport["totals"] = {};

	for (const row of flows) {
		const current = totals[row.currency] ?? { inflow: 0, outflow: 0, net: 0 };
		current.inflow += row.inflow;
		current.outflow += row.outflow;
		current.net += row.net;
		totals[row.currency] = current;
	}

	return { from, to, rows: flows, totals };
}

export type PaymentsReport = {
	orders: Record<string, number>;
	created: number;
	succeeded: number;
	conversion: number;
	revenueMinor: Record<string, number>;
	uniquePayers: number;
	belkoinIssued: number;
};

export async function paymentsReport({ from, to }: { from: Date; to: Date }): Promise<PaymentsReport> {
	const statusRows = await db
		.selectFrom("orders")
		.select(["status", sql<string>`count(*)`.as("count")])
		.where("created_at", ">=", from)
		.where("created_at", "<", to)
		.groupBy("status")
		.execute() as unknown as { status: string; count: string }[];

	const orders: Record<string, number> = {};
	for (const row of statusRows) orders[row.status] = Number(row.count);

	const created = Object.values(orders).reduce((acc, value) => acc + value, 0);
	const succeeded = orders.succeeded ?? 0;

	const [revenue, payers, issued] = await Promise.all([
		db
			.selectFrom("orders")
			.select(["currency", sql<string>`sum(amount_minor)`.as("amount")])
			.where("status", "=", "succeeded")
			.where("created_at", ">=", from)
			.where("created_at", "<", to)
			.groupBy("currency")
			.execute() as unknown as Promise<{ currency: string; amount: string }[]>,
		db
			.selectFrom("orders")
			.select(sql<string>`count(distinct nickname)`.as("count"))
			.where("status", "=", "succeeded")
			.where("created_at", ">=", from)
			.where("created_at", "<", to)
			.executeTakeFirst() as unknown as Promise<{ count: string } | undefined>,
		db
			.selectFrom("orders")
			.select(sql<string>`coalesce(sum(belkoin), 0)`.as("amount"))
			.where("status", "=", "succeeded")
			.where("created_at", ">=", from)
			.where("created_at", "<", to)
			.executeTakeFirst() as unknown as Promise<{ amount: string } | undefined>,
	]);

	const revenueMinor: Record<string, number> = {};
	for (const row of revenue) revenueMinor[row.currency] = Number(row.amount);

	return {
		orders,
		created,
		succeeded,
		conversion: created === 0 ? 0 : succeeded / created,
		revenueMinor,
		uniquePayers: Number(payers?.count ?? 0),
		belkoinIssued: Number(issued?.amount ?? 0),
	};
}

export type WhaleReport = {
	totalBelkoin: number;
	topAmount: number;
	topShare: number;
	holders: number;
};

export async function whaleReport(): Promise<WhaleReport> {
	const [total, top, holders] = await Promise.all([
		db
			.selectFrom("wallets")
			.select(sql<string>`coalesce(sum(balance), 0)`.as("amount"))
			.where("currency", "=", "BELKOIN")
			.executeTakeFirst() as unknown as Promise<{ amount: string } | undefined>,
		db
			.selectFrom("wallets")
			.select(sql<string>`coalesce(sum(balance), 0)`.as("amount"))
			.where("currency", "=", "BELKOIN")
			.where("balance", ">", 0)
			.orderBy("balance", "desc")
			.limit(5)
			.executeTakeFirst() as unknown as Promise<{ amount: string } | undefined>,
		db
			.selectFrom("wallets")
			.select(sql<string>`count(*)`.as("count"))
			.where("currency", "=", "BELKOIN")
			.where("balance", ">", 0)
			.executeTakeFirst() as unknown as Promise<{ count: string } | undefined>,
	]);

	const totalBelkoin = Number(total?.amount ?? 0);
	const topAmount = Number(top?.amount ?? 0);

	return {
		totalBelkoin,
		topAmount,
		topShare: totalBelkoin === 0 ? 0 : topAmount / totalBelkoin,
		holders: Number(holders?.count ?? 0),
	};
}

/** Economy alerts reuse the existing health fan-out (Gotify + Telegram). */
export function sendEconomyAlert(message: string): void {
	try {
		natsService.getInstance().publish(
			SUBJECTS.INTERNAL.HEALTH,
			JSON.stringify({ from: "economy", data: message }),
		);
	} catch (error) {
		appLogger.error({ name: "economy-alert", error });
	}
}
