import { describe, expect, it } from "bun:test";
import { installDatabaseMocks, installNatsMock, type PublishedMessage } from "./__tests__/mocks";

installDatabaseMocks();

const published: PublishedMessage[] = [];
installNatsMock(published);

const reconciliation = await import("./reconciliation.model");
const { SUBJECTS } = await import("#/shared/nats/subjects");

const from = new Date("2026-01-01T00:00:00.000Z");
const to = new Date("2026-02-01T00:00:00.000Z");

function emptyReport() {
	return {
		at: new Date(),
		checked: 0,
		mismatchCount: 0,
		lotMismatch: 0,
		missingPlugin: 0,
		pendingProjection: 0,
		mismatches: [],
		lotMismatches: [],
		missing: [],
	};
}

describe("reconciliation reports on an empty database", () => {
	it("checks no wallets", async () => {
		const report = await reconciliation.reconcileBalances();
		expect(report.checked).toBe(0);
		expect(report.mismatchCount).toBe(0);
		expect(report.mismatches).toEqual([]);
	});

	it("reports an empty grant job queue", async () => {
		expect(await reconciliation.grantJobsReport()).toEqual({
			pending: 0,
			failed: 0,
			stuck: 0,
			oldestPendingAt: null,
			failedSamples: [],
		});
	});

	it("reports empty flows", async () => {
		expect(await reconciliation.faucetSinkReport({ from, to })).toEqual({
			from,
			to,
			rows: [],
			totals: {},
		});
	});

	it("reports zero payments", async () => {
		const report = await reconciliation.paymentsReport({ from, to });
		expect(report.created).toBe(0);
		expect(report.conversion).toBe(0);
		expect(report.revenueMinor).toEqual({});
		expect(report.providerRefundsImplemented).toBe(false);
	});

	it("reports zero whales", async () => {
		expect(await reconciliation.whaleReport()).toEqual({
			totalBelkoin: 0,
			topAmount: 0,
			topShare: 0,
			holders: 0,
		});
	});
});

describe("repairReconciliation", () => {
	it("enqueues only ledger currencies and repairs lot mismatches", async () => {
		const result = await reconciliation.repairReconciliation({
			...emptyReport(),
			mismatchCount: 2,
			mismatches: [
				{ nickname: "Steve", currency: "BELKOIN", wallet: 10, plugin: 5, delta: 5 },
				{ nickname: "Steve", currency: "RUB", wallet: 10, plugin: 5, delta: 5 },
			],
			missing: [{ nickname: "Alex", currency: "CHARISM" }],
			lotMismatches: [
				{ nickname: "Steve", currency: "BELKOIN", wallet: 10, lots: 0, delta: 10 },
				{ nickname: "Alex", currency: "RUB", wallet: 1, lots: 0, delta: 1 },
			],
			lotMismatch: 2,
			missingPlugin: 1,
		});

		expect(result).toEqual({ enqueued: 2, lotRepaired: 1 });
	});

	it("caps the number of enqueued repairs", async () => {
		const mismatches = Array.from({ length: 5 }, (_, index) => ({
			nickname: `player${index}`,
			currency: "BELKOIN",
			wallet: 1,
			plugin: 0,
			delta: 1,
		}));

		const result = await reconciliation.repairReconciliation({
			...emptyReport(),
			mismatchCount: mismatches.length,
			mismatches,
		}, 2);

		expect(result.enqueued).toBe(2);
	});
});

describe("sendEconomyAlert", () => {
	it("publishes to the health subject", () => {
		reconciliation.sendEconomyAlert("mismatch detected");

		expect(published).toHaveLength(1);
		expect(published[0].subject).toBe(SUBJECTS.INTERNAL.HEALTH);
		expect(JSON.parse(published[0].data)).toEqual({ from: "economy", data: "mismatch detected" });
	});
});
