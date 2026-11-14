import Elysia from "elysia";
import { activityNow } from "./activity-now.route";
import { activitySummary } from "./activity-summary.route";
import { activityDaily } from "./activity-daily.route";

export const playerActivity = new Elysia()
  .group("/activity", app => app
    .use(activityNow)
    .use(activitySummary)
    .use(activityDaily)
  )