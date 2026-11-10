import { describe, expect, it } from "bun:test";
import { createLifecycle, defineLifecycle } from "./lifecycle";

describe("createLifecycle", () => {
	it("starts dependencies first and stops in reverse order", async () => {
		const calls: string[] = [];
		const lifecycle = createLifecycle({
			db: {
				start: async () => {
					calls.push("db:start");
					return 1;
				},
				stop: () => { calls.push("db:stop") },
			},
			redis: {
				dependsOn: "db",
				start: async () => { calls.push("redis:start") },
				stop: () => { calls.push("redis:stop") },
			},
		});

		await lifecycle.start();
		expect(calls).toEqual(["db:start", "redis:start"]);
		expect(lifecycle.state()).toBe("ready");

		await lifecycle.stop();
		expect(calls).toEqual(["db:start", "redis:start", "redis:stop", "db:stop"]);
		expect(lifecycle.state()).toBe("stopped");
	});

	it("builder accepts a single key or an array of keys declared above", async () => {
		const calls: string[] = [];
		const lifecycle = defineLifecycle()
			.add("db", { start: async () => { calls.push("db") } })
			.add("redis", { start: async () => { calls.push("redis") } })
			.add("app", {
				dependsOn: ["db", "redis"],
				start: async () => { calls.push("app") },
			})
			.build();

		await lifecycle.start();

		expect(calls.indexOf("app")).toBe(2);
	});

	it("builder rejects a key that is not declared above", () => {
		defineLifecycle()
			.add("db", { start: () => {} })
			.add("app", {
				// @ts-expect-error unknown dependency
				dependsOn: "missing",
				start: () => {},
			});
	});

	it("rejects a dependency declared below the resource", async () => {
		const lifecycle = createLifecycle({
			app: { dependsOn: ["missing"], start: () => {} },
			db: { start: () => {} },
		});

		await expect(lifecycle.start()).rejects.toThrow("unknown");
	});

	it("continues after a non-critical failure and reports degraded", async () => {
		const lifecycle = createLifecycle({
			db: { start: () => 1 },
			minio: {
				critical: false,
				start: (): void => {
					throw new Error("S3 down");
				},
			},
			app: {
				dependsOn: ["db", "minio"],
				start: () => "app",
			},
		});

		const health = await lifecycle.start();

		expect(health.state).toBe("degraded");
		expect(health.resources.find((entry) => entry.name === "app")?.status).toBe("ready");
		expect(health.resources.find((entry) => entry.name === "minio")?.status).toBe("failed");
	});

	it("rolls back started resources on a critical failure", async () => {
		const calls: string[] = [];
		const lifecycle = createLifecycle({
			db: {
				critical: true,
				start: (): void => {
					throw new Error("db down");
				},
			},
			redis: {
				start: () => { calls.push("redis:start") },
				stop: () => { calls.push("redis:stop") },
			},
		});

		await expect(lifecycle.start()).rejects.toThrow("Critical resource");
		expect(lifecycle.state()).toBe("failed");
		expect(calls).toContain("redis:stop");
	});

	it("retries a start and succeeds", async () => {
		let attempts = 0;
		const lifecycle = createLifecycle({
			worker: {
				retries: 1,
				retryDelayMs: 1,
				start: () => {
					attempts += 1;
					if (attempts === 1) throw new Error("first attempt");
					return "ok";
				},
			},
		});

		await lifecycle.start();
		expect(attempts).toBe(2);
		expect(lifecycle.state()).toBe("ready");
	});

	it("fails a resource that exceeds its timeout", async () => {
		const lifecycle = createLifecycle({
			slow: {
				timeoutMs: 10,
				start: () => new Promise(() => {}),
			},
		});

		await expect(lifecycle.start()).rejects.toThrow("Critical resource");
		expect(lifecycle.health().resources[0]?.status).toBe("failed");
	});
});
