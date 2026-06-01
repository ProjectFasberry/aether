import type { DB } from "@repo/shared/types/db/general"
import type Redis from "ioredis"
import { buildRedisKey } from "../../utils/redis"
import type { Kysely } from "kysely"

export const getPlayerUUIDCacheRedisKey = (nickname: string) => buildRedisKey({
  name: `players:uuids:${nickname}`,
  target: "internal",
})

export const createPlayer = (
  { redis, generalDb }: { redis: () => Redis, generalDb: Kysely<DB> }
) => {
  return {
    async getUUID(nickname: string) {
      let playerUUID = await redis().get(getPlayerUUIDCacheRedisKey(nickname))

      if (!playerUUID) {
        const { UUID: uuid } = await generalDb
          .selectFrom("AUTH")
          .select("UUID")
          .where("NICKNAME", "=", nickname)
          .executeTakeFirstOrThrow()

        if (!uuid) {
          throw new Error()
        }

        await redis().set(getPlayerUUIDCacheRedisKey(nickname), uuid)

        playerUUID = uuid;
      }

      return playerUUID
    }
  }
}
