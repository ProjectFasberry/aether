import { describe, expect, it } from "bun:test";
import { isRefundReason, lotKindFor, planLotConsumption, type SpendableLot } from "./lots";

function lot(overrides: Partial<SpendableLot> & Pick<SpendableLot, "id">): SpendableLot {
	return {
		kind: "topup",
		remaining: 0,
		created_at: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("lot FIFO allocation", () => {
	it("spends the oldest top-up first", () => {
		const plan = planLotConsumption([
			lot({ id: 1, remaining: 100, created_at: "2026-01-01T00:00:00.000Z" }),
			lot({ id: 2, remaining: 100, created_at: "2026-02-01T00:00:00.000Z" }),
		], 120);

		expect(plan).toEqual({
			allocations: [
				{ lotId: 1, amount: 100 },
				{ lotId: 2, amount: 20 },
			],
			remaining: 0,
		});
	});

	it("spends top-up lots before rewards", () => {
		const plan = planLotConsumption([
			lot({ id: 1, kind: "reward", remaining: 100, created_at: "2025-01-01T00:00:00.000Z" }),
			lot({ id: 2, kind: "topup", remaining: 30, created_at: "2026-01-01T00:00:00.000Z" }),
		], 50);

		expect(plan.allocations).toEqual([
			{ lotId: 2, amount: 30 },
			{ lotId: 1, amount: 20 },
		]);
	});

	it("returns the uncovered remainder instead of overdrawing", () => {
		const plan = planLotConsumption([
			lot({ id: 1, remaining: 10 }),
		], 25);

		expect(plan).toEqual({
			allocations: [{ lotId: 1, amount: 10 }],
			remaining: 15,
		});
	});

	it("ignores empty and negative lots", () => {
		const plan = planLotConsumption([
			lot({ id: 1, remaining: 0 }),
			lot({ id: 2, remaining: -5 }),
			lot({ id: 3, remaining: 7 }),
		], 7);

		expect(plan.allocations).toEqual([{ lotId: 3, amount: 7 }]);
		expect(plan.remaining).toBe(0);
	});
});

describe("ledger reason classification", () => {
	it("treats refunds, rollbacks and partial refunds as restores", () => {
		expect(isRefundReason("store.refund:BELKOIN")).toBe(true);
		expect(isRefundReason("store.rollback:CHARISM")).toBe(true);
		expect(isRefundReason("store.partial_refund:BELKOIN")).toBe(true);
		expect(isRefundReason("store.purchase:BELKOIN")).toBe(false);
		expect(isRefundReason("payment:BELKOIN")).toBe(false);
	});

	it("maps credits to refundable and non-refundable lot kinds", () => {
		expect(lotKindFor("payment:BELKOIN")).toEqual({ kind: "topup", refundable: true });
		expect(lotKindFor("admin.adjustment")).toEqual({ kind: "adjustment", refundable: false });
		expect(lotKindFor("migration")).toEqual({ kind: "legacy", refundable: false });
		expect(lotKindFor("referral.reward")).toEqual({ kind: "reward", refundable: false });
	});
});
