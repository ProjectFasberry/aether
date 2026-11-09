import { describe, expect, it } from "bun:test";
import { installDatabaseMocks } from "./__tests__/mocks";

installDatabaseMocks();

const jobs = await import("./grant-jobs.model");
const { general } = await import("#/shared/database/general-db");

describe("grant job backoff", () => {
	it("grows exponentially and caps at five minutes", () => {
		expect(jobs.grantJobDelayMs(0)).toBe(1_000);
		expect(jobs.grantJobDelayMs(1)).toBe(2_000);
		expect(jobs.grantJobDelayMs(4)).toBe(16_000);
		expect(jobs.grantJobDelayMs(8)).toBe(256_000);
		expect(jobs.grantJobDelayMs(9)).toBe(300_000);
		expect(jobs.grantJobDelayMs(30)).toBe(300_000);
	});

	it("gives up on the tenth attempt by default", () => {
		expect(jobs.isFinalGrantAttempt(1)).toBe(false);
		expect(jobs.isFinalGrantAttempt(9)).toBe(false);
		expect(jobs.isFinalGrantAttempt(10)).toBe(true);
		expect(jobs.isFinalGrantAttempt(3, 3)).toBe(true);
	});
});

describe("grant job outbox on an empty database", () => {
	it("enqueues a job without returning rows", async () => {
		await expect(jobs.enqueueGrantJob({
			orderId: "order-1",
			kind: "BELKOIN",
			payload: { nickname: "steve", currency: "BELKOIN" },
		})).resolves.toBeUndefined();

		await expect(jobs.enqueueGrantJob({
			orderId: "order-2",
			kind: "store.fulfillment",
			payload: { orderId: "order-2" },
			runAfter: new Date(),
		}, general)).resolves.toBeUndefined();
	});

	it("claims nothing when the queue is empty", async () => {
		expect(await jobs.processGrantJobs(10)).toEqual({ processed: 0, failed: 0 });
	});
});
