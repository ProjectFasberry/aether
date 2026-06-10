import { createPlayerService } from "@repo/core/modules/player";
import { redis } from "../redis/client";
import { general as generalDb } from "../database/general-db"

export const playerService = createPlayerService({
  generalDb,
  redis: redis.getInstance
})
