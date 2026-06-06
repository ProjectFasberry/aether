import { general } from "#/shared/database/general-db";
import { env } from "#/shared/env";
import { createServerStatus } from "@repo/core/modules/status";

export const serverStatus = createServerStatus({
  config: {
    VOLUME_URL: env.VOLUME_URL
  },
  generalDb: general
})
