import { describe, expect, it } from "bun:test";
import { applyServiceState, logging, tryUpdateState } from "./index";

describe("glaux logging state", () => {
	it("updates known keys and rejects unknown ones", () => {
		expect(tryUpdateState("logging.globalError", false)).toBe(true);
		expect(logging.globalError).toBe(false);

		expect(tryUpdateState("logging.missing", true)).toBe(false);
	});

	it("applies a stored snapshot", () => {
		applyServiceState({ logging: { requests: false } as never });

		expect(logging.requests).toBe(false);
	});
});
