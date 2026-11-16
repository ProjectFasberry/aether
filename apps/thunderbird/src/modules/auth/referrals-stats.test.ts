import { describe, expect, it } from "bun:test";
import { REFERRALS_PER_WINDOW, toReferralStats } from "./referrals-stats";

describe("toReferralStats", () => {
	it("coerces a bigint count returned by Postgres", () => {
		expect(toReferralStats("3")).toEqual({
			used: 3,
			remaining: REFERRALS_PER_WINDOW - 3,
			limit: REFERRALS_PER_WINDOW,
		});
	});

	it("treats a missing row as zero used", () => {
		expect(toReferralStats(undefined)).toEqual({
			used: 0,
			remaining: REFERRALS_PER_WINDOW,
			limit: REFERRALS_PER_WINDOW,
		});
	});

	it("never returns a negative remaining value", () => {
		expect(toReferralStats("9")).toEqual({
			used: 9,
			remaining: 0,
			limit: REFERRALS_PER_WINDOW,
		});
	});
});
