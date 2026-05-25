import { cleanOldEvents } from "#/modules/server/events/events.model";
import { updateServerStatus } from "#/modules/server/status/status.model";
import { updateExchangeRates } from "#/modules/store/order/external/cryptobot.model";
import { updateSeemsLikeList } from "#/modules/user/seems-players.model";
import { logger } from "#/utils/config/logger";

type Job = {
  name: string;
  cron: string;
  callback: () => Promise<void>;
  immediately: boolean;
  schedule: boolean;
  allowIsDev?: boolean
}

const cronLogger = logger.withTag("Cron")

async function wrapJobCb(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    cronLogger.success(`Finished job "${name}"`);
  } catch (e) {
    cronLogger.error(`Error in job "${name}"`, e);
  }
}

export const CRON_JOBS: Job[] = [
  {
    name: "update-exchange-rates",
    cron: "0 */10 * * * *",
    callback: async function () {
      await wrapJobCb(this.name, updateExchangeRates)
    },
    immediately: true,
    schedule: true,
    allowIsDev: false
  },
  {
    name: "warn-before-update-exchange-rates",
    cron: "0 5-59/10 * * * *",
    callback: async function () {
      cronLogger.log(`"${this.name}" job will be started in 5 minutes`);
    },
    immediately: true,
    schedule: true,
    allowIsDev: false
  },
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
      cronLogger.log(`"${this.name}" job will be started in 5 minutes`);
    },
    immediately: true,
    schedule: true,
    allowIsDev: true
  },
  {
    name: "update-server-status",
    cron: "* * * * *",
    callback: async function () {
      await wrapJobCb(this.name, updateServerStatus)
    },
    immediately: true,
    schedule: false,
    allowIsDev: false
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