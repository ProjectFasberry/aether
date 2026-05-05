import Elysia from "elysia"
import { validatePermission } from "#/lib/validators";
import { Permissions } from "#/shared/constants/permissions";
import { analyticsRegistrations } from "./analytics-registrations.route";
import { analyticsActivity } from "./analytics-activity.route";

export const analytics = new Elysia()
  .use(validatePermission(Permissions.get("ANALYTICS.READ")))
  .group("/analytics", app => app
    .use(analyticsRegistrations)
    .use(analyticsActivity)
  )