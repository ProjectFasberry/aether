import { createSkins } from "@repo/core/modules/skins/index"
import { general as generalDb } from "#/shared/database/general-db";
import { skins as skinsDb } from "#/shared/database/skins-db";
import { redis } from "#/shared/redis/client";
import { nats } from "#/shared/nats/client";
import { env } from "#/shared/env";

export const skinsModel = createSkins({
  databases: {
    general: generalDb,
    skins: skinsDb,
  },
  redis: redis.getInstance,
  nats: nats.getInstance,
  config: {
    VOLUME_URL: env.VOLUME_URL
  }
})
