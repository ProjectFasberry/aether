import { cleanOldEvents } from "#/modules/server/events/events.model";
import { updateExchangeRates } from "#/modules/store/order/external/cryptobot.model";
import { updateSeemsLikeList } from "#/modules/user/seems-players.model";
import { env } from "../env";
import { redis } from "../redis/client";
import { serverStatusService } from "#/modules/server/status/index.model";
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
    cronLogger.success(`Job "${name}"`);
  } catch (e) {
    cronLogger.error(`Job "${name}"`, e);
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
      await wrapJobCb(this.name, () => serverStatusService.updateServerStatus({
        panelPassword: env.PANEL_PASSWORD,
        panelUser: env.PANEL_USER,
        redis: redis.getInstance
      }))
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
