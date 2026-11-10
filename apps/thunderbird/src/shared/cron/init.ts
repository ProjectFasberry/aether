import { Cron, type CronOptions } from "croner";
import pLimit from "p-limit";
import { CRON_JOBS, runJob, type Job } from "./jobs";
import { cronTasks, type CronTask } from "./state";
import { isProduction } from "../env";
import { cronLogger } from "./logger";

export { cronTasks } from "./state";

const DEFAULT_START_DELAY_MS = 5 * 60_000;
const configuredDelay = Number(Bun.env["CRON_START_DELAY_MS"] ?? DEFAULT_START_DELAY_MS);
const START_DELAY_MS = Number.isFinite(configuredDelay) ? configuredDelay : DEFAULT_START_DELAY_MS;
const IMMEDIATE_CONCURRENCY = 2;

const cronInstances: Cron[] = [];

export function validateJobs(jobs: Job[]): void {
  const names = new Set<string>();

  for (const job of jobs) {
    if (names.has(job.name)) throw new Error(`Duplicate cron job "${job.name}"`);
    names.add(job.name);

    if (!job.schedule && !job.immediately) {
      throw new Error(`Cron job "${job.name}" has neither schedule nor immediate run`);
    }

    if (!Number.isFinite(job.lockTtlMs) || job.lockTtlMs <= 0) {
      throw new Error(`Cron job "${job.name}" has an invalid lockTtlMs`);
    }

    try {
      new Cron(job.cron, { timezone: job.timezone ?? "UTC" }).stop();
    } catch (e) {
      throw new Error(`Cron job "${job.name}" has an invalid schedule`, { cause: e });
    }
  }
}

export function stopJobs(): void {
  for (const instance of cronInstances) instance.stop();
  cronInstances.length = 0;
}

export function startJobs() {
  validateJobs(CRON_JOBS);

  const immediateJobs: Job[] = [];

  for (const job of CRON_JOBS) {
    if (!isProduction && !job.allowIsDev) continue;

    const task: CronTask = {
      immediately: job.immediately,
      schedule: job.schedule,
      allowIsDev: job.allowIsDev,
      scheduledTo: new Date(),
      nextRunAt: null,
      lastRunAt: null,
      lastOutcome: null,
      lastDurationMs: null,
    };

    cronTasks.set(job.name, task);

    if (job.immediately) immediateJobs.push(job);
    if (!job.schedule) continue;

    const timezone = job.timezone ?? "UTC";
    const probe = new Cron(job.cron, { timezone });
    const nextRun = probe.nextRun() ?? new Date();
    probe.stop();

    const startAt = new Date(nextRun.getTime() + START_DELAY_MS);
    const config: CronOptions = { timezone, startAt };
    const cronJob = new Cron(job.cron, config, async () => {
      await runJob(job);

      const current = cronTasks.get(job.name);
      if (current) {
        const next = cronJob.nextRun() ?? null;
        current.nextRunAt = next;
        if (next) current.scheduledTo = next;
      }
    });

    cronInstances.push(cronJob);
    task.scheduledTo = startAt;
    task.nextRunAt = startAt;

    cronLogger.info(`Job "${job.name}" will be started at ${startAt.toISOString()}`);
  }

  const limit = pLimit(IMMEDIATE_CONCURRENCY);

  void Promise.all(
    immediateJobs.map((job) =>
      limit(async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 2_000)));
        await runJob(job);
      }),
    ),
  ).catch((e) => cronLogger.error("Immediate cron jobs failed", e));
}
