import { getEnv } from "../env";
import { redisService } from "../redis/client";
import { withRedisLock } from "../redis/lock";
import { SERVICE_NAME } from "#/shared/constants/internal";
import { cronLogger } from "./logger";
import { markJobRun, type JobOutcome } from "./state";

export type Job = {
  name: string;
  cron: string;
  callback: () => Promise<void>;
  timezone?: string;
  immediately: boolean;
  schedule: boolean;
  allowIsDev: boolean;
  /** How long one replica owns the job before another may retry it. */
  lockTtlMs: number;
}

type JobInput = Omit<Job, "immediately" | "schedule" | "allowIsDev" | "lockTtlMs"> &
  Partial<Pick<Job, "immediately" | "schedule" | "allowIsDev" | "lockTtlMs">>;

const DEFAULT_LOCK_TTL_MS = 55_000;
const STAGE = Bun.env["STAGE"] ?? "dev";

export const cronLockKey = (name: string) =>
  `cron:${SERVICE_NAME}:${STAGE}:${name}`;

export function defineJob(job: JobInput): Job {
  return {
    timezone: "UTC",
    immediately: false,
    schedule: true,
    allowIsDev: false,
    lockTtlMs: DEFAULT_LOCK_TTL_MS,
    ...job,
  };
}

export async function withCronLock(
  name: string,
  ttlMs: number,
  fn: () => Promise<void>,
): Promise<JobOutcome> {
  try {
    await withRedisLock(cronLockKey(name), ttlMs, fn, {
      renewIntervalMs: Math.max(1_000, Math.floor(ttlMs / 2)),
    });
    return "ran";
  } catch (e) {
    // Another replica is already running this tick. Skipping is the point of
    // the lock; do not report it as a job failure.
    if (e instanceof Error && e.message === "LOCK_BUSY") {
      cronLogger.info(`Job "${name}" is already running on another replica`);
      return "busy";
    }

    // A Redis failure must not become an unhandled rejection in the cron
    // scheduler; the next tick retries the job.
    cronLogger.error(`Job "${name}" failed`, e);
    return "failed";
  }
}

export async function runJob(job: Job): Promise<{ outcome: JobOutcome; durationMs: number }> {
  const started = Date.now();
  const outcome = await withCronLock(job.name, job.lockTtlMs, job.callback);
  const durationMs = Date.now() - started;

  markJobRun(job.name, outcome, durationMs);

  if (outcome === "ran") {
    cronLogger.info({ message: "Job finished", job: job.name, durationMs });
  }

  return { outcome, durationMs };
}

export const CRON_JOBS = [
  defineJob({
    name: "clean-old-events",
    cron: "0 */10 * * * *",
    callback: async () => {
      const { cleanOldEvents } = await import("#/modules/server/events/events.model");
      await cleanOldEvents();
    },
    immediately: true,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 9 * 60_000
  }),
  defineJob({
    name: "update-server-status",
    cron: "* * * * *",
    callback: async () => {
      const { serverStatusService } = await import("#/modules/server/status/index.model");
      await serverStatusService.updateServerStatus({
        panelPassword: getEnv().PANEL_PASSWORD,
        panelUser: getEnv().PANEL_USER,
        redis: redisService.getInstance
      })
    },
    immediately: true,
    schedule: false,
    allowIsDev: false,
    lockTtlMs: 55_000
  }),
  defineJob({
    name: "process-grant-jobs",
    cron: "* * * * *",
    callback: async () => {
      const { processGrantJobs } = await import("#/modules/economy/grant-jobs.model");
      const { processed, failed } = await processGrantJobs();

      if (failed > 0) {
        cronLogger.warn(`Economy outbox: ${failed} of ${processed} jobs failed permanently`)
      }
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 55_000
  }),
  defineJob({
    name: "reconcile-economy",
    cron: "0 15 */6 * * *",
    callback: async () => {
      const {
        grantJobsReport,
        reconcileBalances,
        repairReconciliation,
        sendEconomyAlert,
      } = await import("#/modules/economy/reconciliation.model");

      const [balances, jobs] = await Promise.all([
        reconcileBalances(),
        grantJobsReport(),
      ]);

      const problems: string[] = [];

      if (balances.mismatchCount > 0) {
        const sample = balances.mismatches
          .slice(0, 5)
          .map((item) => `${item.nickname} ${item.currency}: ledger ${item.wallet}, plugin ${item.plugin}`)
          .join("; ");
        problems.push(`${balances.mismatchCount} mismatches (${sample})`);
      }

      if (jobs.failed > 0) problems.push(`${jobs.failed} failed grant jobs`);
      if (jobs.stuck > 0) problems.push(`${jobs.stuck} stuck grant jobs`);
      if (balances.missingPlugin > 0) {
        problems.push(`${balances.missingPlugin} wallets without a plugin row`)
      };

      if (problems.length > 0) {
        await sendEconomyAlert(`Reconciliation: ${problems.join(", ")}`);
        cronLogger.warn(`Economy reconciliation: ${problems.join(", ")}`);
      }

      const repaired = await repairReconciliation(balances);
      if (repaired.enqueued > 0) {
        cronLogger.warn(`Economy repair: enqueued ${repaired.enqueued} projections`);
      }
      if (repaired.lotRepaired > 0) {
        cronLogger.warn(`Economy repair: fixed lots for ${repaired.lotRepaired} wallets`);
      }
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 5 * 60_000
  }),
  defineJob({
    name: "repair-store-orders",
    cron: "*/5 * * * *",
    callback: async () => {
      const { repairPendingGameOrders } = await import("#/modules/store/order/internal/order-game.model");
      const { scanned, enqueued } = await repairPendingGameOrders();

      if (enqueued > 0) {
        cronLogger.warn(`Store repair: enqueued ${enqueued} of ${scanned} pending orders`);
      }
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 4 * 60_000
  }),
  defineJob({
    name: "expire-payment-orders",
    cron: "*/5 * * * *",
    callback: async () => {
      const { expireOrders } = await import("#/modules/payments/orders.model");
      const expired = await expireOrders();

      if (expired > 0) {
        cronLogger.info(`Payments: expired ${expired} orders`);
      }
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 4 * 60_000
  }),
  defineJob({
    name: "clean-old-history",
    cron: "0 30 4 * * *",
    callback: async () => {
      const { cleanOldHistory } = await import("#/modules/private/history/history-retention");
      const removed = await cleanOldHistory();

      if (removed > 0) {
        cronLogger.info(`History: removed ${removed} rows older than 180 days`);
      }
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 60 * 60_000
  }),
  defineJob({
    name: "clean-old-activity",
    cron: "0 50 4 * * *",
    callback: async () => {
      const { cleanOldActivity } = await import("#/modules/server/activity/activity-retention");
      const removed = await cleanOldActivity();

      if (removed > 0) {
        cronLogger.info(`Activity: removed ${removed} rows older than 90 days`);
      }
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 60 * 60_000
  }),
  defineJob({
    name: "update-seems-like",
    cron: "0 0 */3 * * *",
    callback: async () => {
      const { updateSeemsLikeList } = await import("#/modules/user/seems-players.model");
      await updateSeemsLikeList();
    },
    immediately: true,
    schedule: false,
    allowIsDev: true,
    lockTtlMs: 60 * 60_000
  })
]
