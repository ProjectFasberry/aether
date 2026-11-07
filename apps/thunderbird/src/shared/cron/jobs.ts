import { cleanOldEvents } from "#/modules/server/events/events.model";
import { updateSeemsLikeList } from "#/modules/user/seems-players.model";
import { getEnv } from "../env";
import { redisService } from "../redis/client";
import { serverStatusService } from "#/modules/server/status/index.model";
import { cleanOldHistory } from "#/modules/private/history/history-retention";
import { processGrantJobs } from "#/modules/economy/grant-jobs.model";
import { repairPendingGameOrders } from "#/modules/store/order/internal/order-game.model";
import { expireOrders } from "#/modules/payments/orders.model";
import { grantJobsReport, reconcileBalances, repairReconciliation, sendEconomyAlert } from "#/modules/economy/reconciliation.model";
import { withRedisLock } from "../redis/lock";
import { cronLogger } from ".";

type Job = {
  name: string;
  cron: string;
  callback: () => Promise<void>;
  immediately: boolean;
  schedule: boolean;
  allowIsDev?: boolean;
  /** How long one replica owns the job before another may retry it. */
  lockTtlMs?: number;
}

export async function withCronLock(name: string, ttlMs: number, fn: () => Promise<void>): Promise<void> {
  try {
    await withRedisLock(`cron:${name}`, ttlMs, fn);
  } catch (e) {
    // Another replica is already running this tick. Skipping is the point of
    // the lock; do not report it as a job failure.
    if (e instanceof Error && e.message === "LOCK_BUSY") {
      cronLogger.info(`Job "${name}" is already running on another replica`);
      return;
    }

    // A Redis failure must not become an unhandled rejection in the cron
    // scheduler; the next tick retries the job.
    cronLogger.error(`Job "${name}" lock failed`, e);
  }
}

async function wrapJobCb(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    cronLogger.info(`Job "${name}"`);
  } catch (e) {
    cronLogger.error(`Job "${name}"`, e);
  }
}

export const CRON_JOBS: Job[] = [
  {
    name: "clean-old-events",
    cron: "0 */10 * * * *",
    callback: async function () {
      await wrapJobCb(this.name, cleanOldEvents)
    },
    immediately: true,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 9 * 60_000
  },
  {
    name: "warn-before-clean-old-events",
    cron: "0 5-59/10 * * * *",
    callback: async function () {
      cronLogger.info(`Job "${this.name}" will be started in 5 minutes`);
    },
    immediately: true,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 9 * 60_000
  },
  {
    name: "update-server-status",
    cron: "* * * * *",
    callback: async function () {
      await wrapJobCb(this.name, () => serverStatusService.updateServerStatus({
        panelPassword: getEnv().PANEL_PASSWORD,
        panelUser: getEnv().PANEL_USER,
        redis: redisService.getInstance
      }))
    },
    immediately: true,
    schedule: false,
    allowIsDev: false,
    lockTtlMs: 55_000
  },
  {
    name: "process-grant-jobs",
    cron: "* * * * *",
    callback: async function () {
      await wrapJobCb(this.name, async () => {
        const { processed, failed } = await processGrantJobs();
        if (failed > 0) cronLogger.warn(`Economy outbox: ${failed} of ${processed} jobs failed permanently`);
      })
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 55_000
  },
  {
    name: "reconcile-economy",
    cron: "0 15 */6 * * *",
    callback: async function () {
      await wrapJobCb(this.name, async () => {
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
        if (balances.missingPlugin > 0) problems.push(`${balances.missingPlugin} wallets without a plugin row`);

        if (problems.length > 0) {
          sendEconomyAlert(`Reconciliation: ${problems.join(", ")}`);
          cronLogger.warn(`Economy reconciliation: ${problems.join(", ")}`);
        }

        const repaired = await repairReconciliation(balances);
        if (repaired.enqueued > 0) {
          cronLogger.warn(`Economy repair: enqueued ${repaired.enqueued} projections`);
        }
        if (repaired.lotRepaired > 0) {
          cronLogger.warn(`Economy repair: fixed lots for ${repaired.lotRepaired} wallets`);
        }
      })
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 5 * 60_000
  },
  {
    name: "repair-store-orders",
    cron: "*/5 * * * *",
    callback: async function () {
      await wrapJobCb(this.name, async () => {
        const { scanned, enqueued } = await repairPendingGameOrders();
        if (enqueued > 0) {
          cronLogger.warn(`Store repair: enqueued ${enqueued} of ${scanned} pending orders`);
        }
      })
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 4 * 60_000
  },
  {
    name: "expire-payment-orders",
    cron: "*/5 * * * *",
    callback: async function () {
      await wrapJobCb(this.name, async () => {
        const expired = await expireOrders();
        if (expired > 0) cronLogger.info(`Payments: expired ${expired} orders`);
      })
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 4 * 60_000
  },
  {
    name: "clean-old-history",
    cron: "0 30 4 * * *",
    callback: async function () {
      await wrapJobCb(this.name, async () => {
        const removed = await cleanOldHistory();
        if (removed > 0) cronLogger.info(`History: removed ${removed} rows older than 180 days`);
      })
    },
    immediately: false,
    schedule: true,
    allowIsDev: true,
    lockTtlMs: 60 * 60_000
  },
  {
    name: "update-seems-like",
    cron: "0 0 */3 * * *",
    callback: async function () {
      await wrapJobCb(this.name, updateSeemsLikeList)
    },
    immediately: true,
    schedule: false,
    allowIsDev: true,
    lockTtlMs: 60 * 60_000
  }
]
