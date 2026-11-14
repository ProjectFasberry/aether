import { createSkinsService } from "@repo/core/modules/skins/index"
import { general as generalDb } from "#/shared/database/general-db";
import { skins as skinsDb } from "#/shared/database/skins-db";
import { redisService } from "#/shared/redis/client";
import { getEnv } from "#/shared/env";
import { callSkinsApply } from "#/shared/nats/command";

export const skinsService = createSkinsService({
  databases: {
    general: generalDb,
    skins: skinsDb,
  },
  redis: redisService.getInstance,
  config: {
    VOLUME_URL: getEnv().VOLUME_URL,
    API_URL: getEnv().PUBLIC_API_URL,
  },
  applySelection: getEnv().SKINS_APPLY_MODE === "command" ? callSkinsApply : undefined,
})
