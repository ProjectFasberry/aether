import { describe, expect, it } from "bun:test";
import { DONATE_GROUPS } from "@repo/shared/constants/donate-aliases";
import { donateSchema } from "@repo/shared/types/entities/donate";
import { resolveDonateGroup } from "./player-donate";

describe("resolveDonateGroup", () => {
	it("keeps every known group", () => {
		for (const group of Object.keys(DONATE_GROUPS) as (keyof typeof DONATE_GROUPS)[]) {
			expect(resolveDonateGroup(group)).toBe(group);
		}
	});

	it("normalizes the case", () => {
		expect(resolveDonateGroup("ARKHONT")).toBe("arkhont");
		expect(resolveDonateGroup("Testers")).toBe("testers");
	});

	it("falls back to the default group", () => {
		expect(resolveDonateGroup(null)).toBe("default");
		expect(resolveDonateGroup(undefined)).toBe("default");
		expect(resolveDonateGroup("")).toBe("default");
		expect(resolveDonateGroup("vip")).toBe("default");
	});

	it("keeps the donate schema in sync with the group constants", () => {
		expect([...donateSchema.options].sort()).toEqual(
			(Object.keys(DONATE_GROUPS) as (keyof typeof DONATE_GROUPS)[]).sort()
		);
	});
});
