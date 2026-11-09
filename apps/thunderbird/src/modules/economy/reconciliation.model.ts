import { general } from "#/shared/database/general-db";
import { playerpoints } from "#/shared/database/playerpoints-db";
import { bisquite } from "#/shared/database/bisquite-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { appLogger } from "#/shared/constants/logger";
import { enqueueGrantJob } from "./grant-jobs.model";
import { isCurrency, repairWalletLots } from "./wallet.model";
import { projectionKey, sumByCurrency, walletKey } from "./reconciliation.pure";
import { sql } from "kysely";

export type BalanceMismatch = {
	nickname: string;
	currency: string;
	wallet: number;
	plugin: number;
	delta: number;
};

export type LotMismatch = {
	nickname: string;
	currency: string;
	wallet: number;
	lots: number;
	delta: number;
};

export type ReconciliationReport = {
	at: Date;
	checked: number;
	mismatchCount: number;
	lotMismatch: number;
	missingPlugin: number;
	pendingProjection: number;
	mismatches: BalanceMismatch[];
	lotMismatches: LotMismatch[];
	missing: { nickname: string; currency: string }[];
};

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
		map.set(walletKey("BELKOIN", row.nickname), Math.round(Number(row.balance ?? 0)));
	}

	for (const row of charism) {
		if (!row.nickname) continue;
		map.set(walletKey("CHARISM", String(row.nickname)), Math.round(Number(row.balance ?? 0)));
	}

	return map;
}

async function pendingProjections(): Promise<Set<string>> {
	const jobs = await general
		.selectFrom("grant_jobs")
		.select("payload")
		.where("status", "=", "pending")
		.execute();

	const keys = jobs.map((job) => projectionKey(job.payload)).filter((key): key is string => key !== null);

	return new Set(keys);
}

/**
 * Compares every wallet with the plugin table the game servers read. The
 * plugin is still the delivery target, so a difference means the projection is
 * behind (queued) or the ledger and the plugin disagree.
 */
export async function reconcileBalances({ limit = 5_000 } = {}): Promise<ReconciliationReport> {
	const [wallets, plugin, pending, lotRows] = await Promise.all([
		general
			.selectFrom("wallets")
			.select(["nickname", "currency", "balance"])
			.orderBy("nickname", "asc")
			.limit(limit)
			.execute(),
		pluginBalances(),
		pendingProjections(),
		general
			.selectFrom("wallet_lots")
			.select(["nickname", "currency", sql<string>`sum(remaining)`.as("remaining")])
			.groupBy(["nickname", "currency"])
			.execute(),
	]);

	const lotMap = new Map(lotRows.map((row) => (
		[walletKey(String(row.currency), row.nickname), Number(row.remaining)]
	)));

	const mismatches: BalanceMismatch[] = [];
	const lotMismatches: LotMismatch[] = [];
	const missing: { nickname: string; currency: string }[] = [];
	let missingPlugin = 0;
	let pendingProjection = 0;

	for (const wallet of wallets) {
		const key = walletKey(wallet.currency, wallet.nickname);
		const walletBalance = Number(wallet.balance);
		const lotSum = lotMap.get(key) ?? 0;

		if (lotSum !== walletBalance) {
			lotMismatches.push({
				nickname: wallet.nickname,
				currency: wallet.currency,
				wallet: walletBalance,
				lots: lotSum,
				delta: walletBalance - lotSum,
			});
		}

		const pluginBalance = plugin.get(key);

		if (pluginBalance === undefined) {
			// A zero wallet without a plugin row is normal: the player never
			// joined the game server, so there is nothing to project.
			if (walletBalance === 0) continue;

			if (pending.has(key)) {
				pendingProjection += 1;
				continue;
			}

			missingPlugin += 1;
			missing.push({ nickname: wallet.nickname, currency: wallet.currency });
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
		lotMismatch: lotMismatches.length,
		missingPlugin,
		pendingProjection,
		mismatches: mismatches.slice(0, 100),
		lotMismatches: lotMismatches.slice(0, 100),
		missing: missing.slice(0, 100),
	};
}

/**
 * Re-enqueues a projection for every mismatch and every wallet whose plugin
 * row disappeared. The job reads the current wallet, so repeating it is safe.
 */
export async function repairReconciliation(
	report: ReconciliationReport,
	limit = 100,
): Promise<{ enqueued: number; lotRepaired: number }> {
	const candidates = [
		...report.mismatches.map((item) => ({ nickname: item.nickname, currency: item.currency })),
		...report.missing.map((item) => ({ nickname: item.nickname, currency: item.currency })),
	].slice(0, limit);

	// One repair attempt per wallet per hour: a done job must not block a later
	// repair, but a 6-hourly cron must not create an unbounded queue either.
	const bucket = new Date().toISOString().slice(0, 13);
	const missingKeys = new Set(report.missing.map((item) => walletKey(item.currency, item.nickname)));
	let enqueued = 0;

	for (const item of candidates) {
		if (!isCurrency(item.currency)) continue;

		const key = walletKey(item.currency, item.nickname);
		await enqueueGrantJob({
			orderId: `projection:repair:${key}:${bucket}`,
			kind: item.currency,
			payload: { nickname: item.nickname, currency: item.currency },
			// A missing plugin row usually means the player has not joined yet.
			// Give CMI/PlayerPoints an hour to create it instead of burning all
			// retries immediately.
			runAfter: missingKeys.has(key)
				? new Date(Date.now() + 60 * 60_000)
				: undefined,
		});

		enqueued += 1;
	}

	let lotRepaired = 0;

	for (const item of report.lotMismatches.slice(0, limit)) {
		if (!isCurrency(item.currency)) continue;

		try {
			await repairWalletLots(item.nickname, item.currency);
			lotRepaired += 1;
		} catch (error) {
			// Overcovered lots (lots > balance) cannot be repaired automatically.
			appLogger.error({ name: "economy-lot-repair", error });
		}
	}

	return { enqueued, lotRepaired };
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
		general.selectFrom("grant_jobs").select((eb) => eb.fn.countAll<number>().as("count")).where("status", "=", "pending").executeTakeFirst(),
		general.selectFrom("grant_jobs").select((eb) => eb.fn.countAll<number>().as("count")).where("status", "=", "failed").executeTakeFirst(),
		general.selectFrom("grant_jobs")
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.where("status", "=", "pending")
			.where("run_after", "<", stuckBefore)
			.executeTakeFirst(),
		general.selectFrom("grant_jobs")
			.select("created_at")
			.where("status", "=", "pending")
			.orderBy("created_at", "asc")
			.limit(1)
			.executeTakeFirst(),
		general.selectFrom("grant_jobs")
			.select(["order_id", "kind", "last_error", "attempts"])
			.where("status", "=", "failed")
			.orderBy("id", "desc")
			.limit(10)
			.execute(),
	]);

	return {
		pending: pending?.count ?? 0,
		failed: failed?.count ?? 0,
		stuck: stuck?.count ?? 0,
		oldestPendingAt: oldest?.created_at ?? null,
		failedSamples: samples.map((row) => ({
			orderId: row.order_id,
			kind: row.kind,
			error: row.last_error,
			attempts: row.attempts,
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
	const rows = await general
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
		.execute();

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
	refunded: number;
	conversion: number;
	revenueMinor: Record<string, number>;
	refundedMinor: Record<string, number>;
	/** Ledger-net cash from top-ups; provider refunds are not implemented yet. */
	netRevenueMinor: Record<string, number>;
	providerRefundsImplemented: false;
	uniquePayers: number;
	belkoinIssued: number;
};

export async function paymentsReport({ from, to }: { from: Date; to: Date }): Promise<PaymentsReport> {
	const [statusRows, paid, revenue, refunded, payers, issued] = await Promise.all([
		general
			.selectFrom("orders")
			.select(["status", sql<string>`count(*)`.as("count")])
			.where("created_at", ">=", from)
			.where("created_at", "<", to)
			.groupBy("status")
			.execute(),
		general
			.selectFrom("orders")
			.select(sql<string>`count(*)`.as("count"))
			.where("paid_at", ">=", from)
			.where("paid_at", "<", to)
			.executeTakeFirst(),
		// Revenue is cash received in the period, including payments that were
		// refunded later; refunds are counted separately by refunded_at.
		general
			.selectFrom("orders")
			.select(["currency", sql<string>`sum(amount_minor)`.as("amount")])
			.where("paid_at", ">=", from)
			.where("paid_at", "<", to)
			.groupBy("currency")
			.execute(),
		general
			.selectFrom("orders")
			.select(["currency", sql<string>`sum(amount_minor)`.as("amount")])
			.where("refunded_at", ">=", from)
			.where("refunded_at", "<", to)
			.groupBy("currency")
			.execute(),
		general
			.selectFrom("orders")
			.select(sql<string>`count(distinct nickname)`.as("count"))
			.where("paid_at", ">=", from)
			.where("paid_at", "<", to)
			.executeTakeFirst(),
		general
			.selectFrom("orders")
			.select(sql<string>`coalesce(sum(belkoin), 0)`.as("amount"))
			.where("paid_at", ">=", from)
			.where("paid_at", "<", to)
			.executeTakeFirst(),
	]);

	const orders: Record<string, number> = {};
	for (const row of statusRows) orders[row.status] = Number(row.count);

	const created = Object.values(orders).reduce((acc, value) => acc + value, 0);
	const succeeded = Number(paid?.count ?? 0);

	// Refund count uses refunded_at, so it is the period count, not the number
	// of currently refunded orders created in the period.
	const refundedOrders = await general
		.selectFrom("orders")
		.select(sql<string>`count(*)`.as("count"))
		.where("refunded_at", ">=", from)
		.where("refunded_at", "<", to)
		.executeTakeFirst();
	const refundedCount = Number(refundedOrders?.count ?? 0);

	const revenueMinor = sumByCurrency(revenue);
	const refundedMinor = sumByCurrency(refunded);
	const netRevenueMinor: Record<string, number> = { ...revenueMinor };

	for (const [currency, amount] of Object.entries(refundedMinor)) {
		netRevenueMinor[currency] = Number(netRevenueMinor[currency] ?? 0) - amount;
	}

	return {
		orders,
		created,
		succeeded,
		refunded: refundedCount,
		conversion: created === 0 ? 0 : succeeded / created,
		revenueMinor,
		refundedMinor,
		netRevenueMinor,
		providerRefundsImplemented: false,
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
		general
			.selectFrom("wallets")
			.select(sql<string>`coalesce(sum(balance), 0)`.as("amount"))
			.where("currency", "=", "BELKOIN")
			.executeTakeFirst(),
		general
			.selectFrom("wallets")
			.select("balance")
			.where("currency", "=", "BELKOIN")
			.where("balance", ">", "0")
			.orderBy("balance", "desc")
			.limit(5)
			.execute(),
		general
			.selectFrom("wallets")
			.select(sql<string>`count(*)`.as("count"))
			.where("currency", "=", "BELKOIN")
			.where("balance", ">", "0")
			.executeTakeFirst(),
	]);

	const totalBelkoin = Number(total?.amount ?? 0);
	const topAmount = top.reduce((acc, row) => acc + Number(row.balance), 0);

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
