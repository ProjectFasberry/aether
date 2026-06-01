import { getRedisKey } from "#/helpers/redis"
import { general } from "#/shared/database/general-db"
import { redis } from "#/shared/redis/client"

export const getPlayerUUIDCacheRedisKey = (nickname: string) => getRedisKey("internal", `players:uuids:${nickname}`)

export async function getPlayerUUID(nickname: string) {
  const redisClient = redis.getInstance()

  let playerUUID = await redisClient.get(getPlayerUUIDCacheRedisKey(nickname))

  if (!playerUUID) {
    const { UUID: uuid } = await general
      .selectFrom("AUTH")
      .select("UUID")
      .where("NICKNAME", "=", nickname)
      .executeTakeFirstOrThrow()

    if (!uuid) {
      throw new Error()
    }

    await redisClient.set(getPlayerUUIDCacheRedisKey(nickname), uuid)

    playerUUID = uuid;
  }

  return playerUUID
}
