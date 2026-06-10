import { general } from "#/shared/database/general-db";
import { env } from "#/shared/env";
import { createServerStatusService } from "@repo/core/modules/status";

export const serverStatusService = createServerStatusService({
  config: {
    VOLUME_URL: env.VOLUME_URL
  },
  generalDb: general
})
