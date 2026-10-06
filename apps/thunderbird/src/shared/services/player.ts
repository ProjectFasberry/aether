import { createPlayerService } from "@repo/core/modules/player";
import { redisService } from "../redis/client";
import { general as generalDb } from "../database/general-db"

export const playerService = createPlayerService({
  generalDb,
  redis: redisService.getInstance
})
