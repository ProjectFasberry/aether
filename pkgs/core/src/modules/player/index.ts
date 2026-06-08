import type { DB } from "@repo/shared/types/db/general"
import type Redis from "ioredis"
import { buildRedisKey } from "../../utils/redis"
import type { Kysely } from "kysely"

export const getPlayerUUIDCacheRedisKey = (nickname: string) => buildRedisKey({
  name: `players:uuids:${nickname}`,
  target: "internal",
})

type PlayerService = {
  redis: () => Redis,
  generalDb: Kysely<DB>
}

export const createPlayerService = ({
  redis, generalDb
}: PlayerService) => {
  return {
    async getUUID(nickname: string): Promise<string> {
      const playerUUIDKey = getPlayerUUIDCacheRedisKey(nickname);
      const playerUUID = await redis().get(playerUUIDKey)

      if (!playerUUID) {
        const { UUID } = await generalDb
          .selectFrom("AUTH")
          .select("UUID")
          .where("NICKNAME", "=", nickname)
          .executeTakeFirstOrThrow()

        if (!UUID) {
          throw new Error("UUID is not found")
        }

        await redis().set(playerUUIDKey, UUID)
        console.log("UUID cached updated for", nickname)

        return UUID;
      }

      return playerUUID
    }
  }
}
