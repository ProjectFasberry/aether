import { cleanOldEvents } from "#/modules/server/events/events.model";
import { updateSeemsLikeList } from "#/modules/user/seems-players.model";
import { getEnv } from "../env";
import { redisService } from "../redis/client";
import { serverStatusService } from "#/modules/server/status/index.model";
import { cleanOldHistory } from "#/modules/private/history/history-retention";
import { processGrantJobs } from "#/modules/economy/grant-jobs.model";
import { repairPendingGameOrders } from "#/modules/store/order/internal/order-game.model";
import { expireOrders } from "#/modules/payments/orders.model";
import { grantJobsReport, reconcileBalances, sendEconomyAlert } from "#/modules/economy/reconciliation.model";
import { cronLogger } from ".";

type Job = {
  name: string;
  cron: string;
  callback: () => Promise<void>;
  immediately: boolean;
  schedule: boolean;
  allowIsDev?: boolean
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
    allowIsDev: true
  },
  {
    name: "warn-before-clean-old-events",
    cron: "0 5-59/10 * * * *",
    callback: async function () {
      cronLogger.info(`Job "${this.name}" will be started in 5 minutes`);
    },
    immediately: true,
    schedule: true,
    allowIsDev: true
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
    allowIsDev: false
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
    allowIsDev: true
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
      })
    },
    immediately: false,
    schedule: true,
    allowIsDev: true
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
    allowIsDev: true
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
    allowIsDev: true
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
    allowIsDev: true
  },
  {
    name: "update-seems-like",
    cron: "0 0 */3 * * *",
    callback: async function () {
      await wrapJobCb(this.name, updateSeemsLikeList)
    },
    immediately: true,
    schedule: false,
    allowIsDev: true
  }
]
