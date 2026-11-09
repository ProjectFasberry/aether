import { describe, expect, it } from "bun:test";
import { installDatabaseMocks } from "./__tests__/mocks";

installDatabaseMocks();

const wallet = await import("./wallet.model");
const { general } = await import("#/shared/database/general-db");

const options = { reason: "test" };

describe("currency guard", () => {
	it("accepts only ledger currencies", () => {
		expect(wallet.isCurrency("BELKOIN")).toBe(true);
		expect(wallet.isCurrency("CHARISM")).toBe(true);
		expect(wallet.isCurrency("belkoin")).toBe(false);
		expect(wallet.isCurrency("RUB")).toBe(false);
	});
});

describe("wallet reads", () => {
	it("falls back to the plugin balance for a walletless player", async () => {
		expect(await wallet.getBalance("nobody", "BELKOIN")).toBe(0);
		expect(await wallet.getBalance("nobody", "CHARISM")).toBe(0);
	});

	it("returns both balances", async () => {
		expect(await wallet.getWallet("nobody")).toEqual({ BELKOIN: 0, CHARISM: 0 });
	});

	it("reports no refundable lots and no entries", async () => {
		expect(await wallet.getRefundable("nobody", "BELKOIN")).toBe(0);
		expect(await wallet.getOrderEntries("order-1")).toEqual([]);
	});
});

describe("wallet writes on an empty database", () => {
	it("rejects a zero delta before touching the ledger", async () => {
		await expect(wallet.credit("nobody", "BELKOIN", 0, options)).rejects.toThrow("ZERO_DELTA");
		await expect(wallet.debit("nobody", "BELKOIN", 0, options)).rejects.toThrow("ZERO_DELTA");
	});

	it("is a no-op when the top-up lot is gone", async () => {
		expect(await wallet.refundTopup({ orderId: "order-1", actor: "admin", adminReason: "test" })).toBeNull();
	});

	it("cannot repair a wallet that does not exist", async () => {
		expect(await wallet.repairWalletLots("nobody", "BELKOIN")).toBeNull();
	});

	it("flushes an empty projection list", async () => {
		await expect(wallet.flushProjections([])).resolves.toBeUndefined();
	});

	it("opens a transaction builder", () => {
		expect(typeof wallet.economyTransaction().execute).toBe("function");
		expect(general).toBeDefined();
	});
});

describe("refundPurchasesInTransaction", () => {
	it("re-syncs an already refunded order without crediting again", async () => {
		const result = await general.transaction().execute((trx) => wallet.refundPurchasesInTransaction(trx, {
			orderId: "order-1",
			reasonPrefix: "store.refund",
			actor: "admin",
			resync: true,
		}));

		expect(result).toEqual({ applied: [], refunded: [] });
	});

	it("credits nothing when the order has no purchase entries", async () => {
		const result = await general.transaction().execute((trx) => wallet.refundPurchasesInTransaction(trx, {
			orderId: "order-1",
			reasonPrefix: "store.rollback",
			actor: "system",
		}));

		expect(result).toEqual({ applied: [], refunded: [] });
	});
});
