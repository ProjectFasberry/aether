import Elysia from "elysia";
import { githubWebhook } from "../webhooks/github";
import { buildMetricsRoute } from "../metrics/build-metrics.route";

export const service = new Elysia()
  .use(githubWebhook)
  .use(buildMetricsRoute);
