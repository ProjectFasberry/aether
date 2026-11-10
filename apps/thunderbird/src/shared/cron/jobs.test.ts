import { beforeEach, describe, expect, it, mock } from "bun:test";

let lock: "ok" | "busy" | "fail" = "ok";

mock.module("../env", () => ({
	getEnv: () => ({ PANEL_USER: "", PANEL_PASSWORD: "" }),
	isProduction: false,
}));
mock.module("../redis/client", () => ({
	redisService: { getInstance: () => ({}) },
}));
mock.module("../redis/lock", () => ({
	withRedisLock: async (
		_key: string,
		_ttl: number,
		fn: () => Promise<unknown>,
	) => {
		if (lock === "busy") throw new Error("LOCK_BUSY");
		if (lock === "fail") throw new Error("redis failed");
		return fn();
	},
}));

const { cronTasks } = await import("./state");
const { CRON_JOBS, defineJob, runJob, withCronLock } = await import("./jobs");
const { validateJobs } = await import("./init");

const job = defineJob({
	name: "test-job",
	cron: "* * * * *",
	callback: async () => {},
});

beforeEach(() => {
	lock = "ok";
	cronTasks.clear();
	cronTasks.set("test-job", {
		immediately: false,
		schedule: true,
		allowIsDev: false,
		scheduledTo: new Date(),
		nextRunAt: null,
		lastRunAt: null,
		lastOutcome: null,
		lastDurationMs: null,
	});
});

describe("cron jobs", () => {
	it("applies defaults in defineJob", () => {
		expect(job).toMatchObject({
			immediately: false,
			schedule: true,
			allowIsDev: false,
			lockTtlMs: 55_000,
			timezone: "UTC",
		});
	});

	it("rejects duplicate names and impossible jobs", () => {
		expect(() => validateJobs([job, job])).toThrow("Duplicate cron job");
		expect(() => validateJobs([{ ...job, schedule: false, immediately: false }])).toThrow(
			"neither schedule nor immediate",
		);
		expect(() => validateJobs([{ ...job, cron: "not a cron" }])).toThrow("invalid schedule");
	});

	it("accepts the real registry", () => {
		expect(() => validateJobs(CRON_JOBS)).not.toThrow();
	});

	it("records the outcome and duration of a run", async () => {
		const result = await runJob(job);
		const task = cronTasks.get("test-job");

		expect(result.outcome).toBe("ran");
		expect(task?.lastOutcome).toBe("ran");
		expect(task?.lastRunAt).toBeInstanceOf(Date);
		expect(task?.lastDurationMs).toBeGreaterThanOrEqual(0);
	});

	it("reports busy and failed lock outcomes", async () => {
		lock = "busy";
		expect(await withCronLock("test-job", 1000, async () => {})).toBe("busy");

		lock = "fail";
		expect(await withCronLock("test-job", 1000, async () => {})).toBe("failed");
	});
});
