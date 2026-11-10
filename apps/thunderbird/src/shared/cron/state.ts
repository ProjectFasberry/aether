export type JobOutcome = "ran" | "busy" | "failed";

export type CronTask = {
  immediately: boolean;
  schedule: boolean;
  allowIsDev: boolean;
  /** Legacy field kept for the /service/cron contract. */
  scheduledTo: Date;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  lastOutcome: JobOutcome | null;
  lastDurationMs: number | null;
};

export const cronTasks = new Map<string, CronTask>();

export function markJobRun(name: string, outcome: JobOutcome, durationMs: number): void {
  const task = cronTasks.get(name);
  if (!task) return;

  task.lastRunAt = new Date();
  task.lastOutcome = outcome;
  task.lastDurationMs = durationMs;
}
