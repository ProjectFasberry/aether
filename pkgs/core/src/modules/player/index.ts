import type { DB } from "@gen/db/general"
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
    async getUuid(nickname: string): Promise<string> {
      const cacheKey = getPlayerUUIDCacheRedisKey(nickname);
      const cache = await redis().get(cacheKey)

      if (!cache) {
        const { uuid } = await generalDb
          .selectFrom("accounts")
          .select("uuid")
          .where("lower_nickname", "=", nickname.toLowerCase())
          .executeTakeFirstOrThrow()

        await redis().set(cacheKey, uuid)

        return uuid;
      }

      return cache
    }
  }
}
