import { beforeEach, describe, expect, it } from "bun:test";
import { installGlauxMocks, resetState, state } from "../../__tests__/harness";

installGlauxMocks();

const { appService } = await import("../../app");

const post = (body: unknown, token?: string) =>
	appService.get().handle(new Request("http://localhost/internal/alerts", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(body),
	}));

beforeEach(() => {
	resetState();
});

describe("POST /internal/alerts", () => {
	it("requires an API key", async () => {
		const response = await post({ from: "test", message: "hello" });

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
	});

	it("rejects an unknown API key", async () => {
		const response = await post({ from: "test", message: "hello" }, "unknown");

		expect(response.status).toBe(401);
	});

	it("accepts a valid key and reports the delivery count", async () => {
		state.apiKey.valid = true;

		const response = await post({ from: "test", message: "hello", severity: "critical" }, "key");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ data: { delivered: 1 } });
		expect(state.alerts).toEqual([
			{ from: "test", message: "hello", severity: "critical" },
		]);
	});

	it("validates the body", async () => {
		state.apiKey.valid = true;

		const response = await post({ from: "test" }, "key");

		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({ error: "VALIDATION" });
	});
});
