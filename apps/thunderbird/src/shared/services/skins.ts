import { createSkinsService } from "@repo/core/modules/skins/index"
import { general as generalDb } from "#/shared/database/general-db";
import { skins as skinsDb } from "#/shared/database/skins-db";
import { redis } from "#/shared/redis/client";
import { env } from "#/shared/env";

export const skinsService = createSkinsService({
  databases: {
    general: generalDb,
    skins: skinsDb,
  },
  redis: redis.getInstance,
  config: {
    VOLUME_URL: env.VOLUME_URL
  }
})
