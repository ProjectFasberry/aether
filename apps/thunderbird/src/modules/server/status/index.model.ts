import { general as generalDb } from "#/shared/database/general-db";
import { getEnv } from "#/shared/env";
import { createServerStatusService } from "@repo/core/modules/status";

export const serverStatusService = createServerStatusService({
  config: {
    VOLUME_URL: getEnv().VOLUME_URL
  },
  generalDb
})
