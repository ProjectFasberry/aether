import { describe, expect, it } from "bun:test";
import Elysia from "elysia";
import { requestIdPlugin } from "./request-id";

const app = new Elysia()
	.use(requestIdPlugin())
	.get("/id", ({ requestId }) => ({ requestId }));

const request = (headers?: Record<string, string>) =>
	app.handle(new Request("http://localhost/id", { headers }));

describe("requestIdPlugin", () => {
	it("reuses an incoming x-request-id and echoes it", async () => {
		const response = await request({ "x-request-id": "edge-123" });

		expect(response.headers.get("x-request-id")).toBe("edge-123");
		expect(await response.json()).toEqual({ requestId: "edge-123" });
	});

	it("generates an id when the header is missing", async () => {
		const response = await request();
		const id = response.headers.get("x-request-id");

		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		expect(await response.json()).toEqual({ requestId: id });
	});
});
