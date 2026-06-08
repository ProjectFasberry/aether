import { Cron, type CronOptions } from "croner";
import { CRON_JOBS } from "./jobs";
import { isProduction } from "../env";
import { cronLogger } from ".";

type CronTask = Pick<(typeof CRON_JOBS)[number], "immediately" | "schedule" | "allowIsDev"> & {
	scheduledTo: Date;
};

export const cronTasks: Map<string, CronTask> = new Map();

export function startJobs() {
	const immediatelyJobs: Array<() => Promise<void>> = [];

	for (const job of CRON_JOBS) {
		let config: CronOptions = {};

		if (!isProduction) {
			if (!job.allowIsDev) {
				continue;
			}
		}

		if (job.immediately) {
			immediatelyJobs.push(async () => await job.callback());
		}

		const info: Omit<CronTask, "scheduledTo"> = {
			immediately: job.immediately,
			schedule: job.schedule,
			allowIsDev: job.allowIsDev,
		};

		cronTasks.set(job.name, {
			...info,
			scheduledTo: new Date(),
		});

		if (job.schedule) {
			const temp = new Cron(job.cron);
			const nextRun = temp.nextRun();

			if (!nextRun) continue;

			const delayedStart = new Date(nextRun.getTime() + 5 * 60 * 1000);

			config = {
				startAt: delayedStart,
			};

			cronTasks.set(job.name, {
				...info,
				scheduledTo: delayedStart,
			});
		}

		const cronJob = new Cron(job.cron, config, async () => await job.callback());

		cronLogger.log(`Job "${job.name}" will be started at ${cronJob.nextRun()?.toISOString()}`);
	}

	immediatelyJobs.forEach((fn) => {
		fn();
	});
}
