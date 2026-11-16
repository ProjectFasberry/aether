import { createSkinsService } from "@repo/core/modules/skins/index"
import { general as generalDb } from "#/shared/database/general-db";
import { skins as skinsDb } from "#/shared/database/skins-db";
import { redisService } from "#/shared/redis/client";
import { getEnv } from "#/shared/env";
import { callSkinsApply, callSkinsClear } from "#/shared/nats/command";
import { minioService } from "#/shared/services/minio";

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
  minio: minioService.getInstance,
  applySelection: getEnv().SKINS_APPLY_MODE === "command" ? callSkinsApply : undefined,
  clearSelection: getEnv().SKINS_APPLY_MODE === "command" ? callSkinsClear : undefined,
})
