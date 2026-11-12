import { describe, expect, it } from "bun:test";
import { logger } from "@repo/shared/utils/logger";

/**
 * Logging is on the request path: a `JSON.stringify` failure would turn a
 * successful operation into a 500. Kysely insert results carry a `bigint`
 * (`numInsertedOrUpdatedRows`), and any object may be circular.
 */
describe("dev logger formatting", () => {
	const scoped = logger.child({ name: "test" });

	it("serializes a bigint instead of throwing", () => {
		expect(() => scoped.debug({ numInsertedOrUpdatedRows: 1n })).not.toThrow();
	});

	it("survives a circular object", () => {
		const value: Record<string, unknown> = { id: 1 };
		value.self = value;

		expect(() => scoped.debug(value)).not.toThrow();
	});
});
