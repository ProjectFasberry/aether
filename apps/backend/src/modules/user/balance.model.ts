import { bisquite } from "#/shared/database/bisquite-db"
import { playerpoints } from "#/shared/database/playerpoints-db"
import type { DB as bisquiteDB } from "@repo/shared/types/db/bisquite-database-types"
import { DB as playerpointsDB } from "@repo/shared/types/db/player-points-database-types"
import type { CartFinalPrice } from "@repo/shared/types/entities/store"
import type { Kysely } from "kysely"
import * as z from "zod/v4"

const charismInstanceDb: Record<Server, Kysely<bisquiteDB> | null> = {
  bisquite: bisquite,
  muffin: null
}

export async function getBelkoin(nickname: string) {
  const query = await playerpoints
    .selectFrom("playerpoints_points")
    .innerJoin("playerpoints_username_cache", "playerpoints_username_cache.uuid", "playerpoints_points.uuid")
    .select([
      "playerpoints_points.points as data"
    ])
    .where("playerpoints_username_cache.username", "=", nickname)
    .executeTakeFirst()

  return query?.data ?? 0
}

type Server = z.infer<typeof balanceSchema>["server"]

export async function getCharism(nickname: string, server: Server) {
  const db = charismInstanceDb[server];
  if (!db) return 0;

  const query = await db
    .selectFrom("cmi_users")
    .select([
      "Balance as data"
    ])
    .where("username", "=", nickname)
    .executeTakeFirst()

  return query?.data ?? 0
}

export async function getBalance(nickname: string, { server }: z.infer<typeof balanceSchema>): Promise<CartFinalPrice> {
  const [charism, belkoin] = await Promise.all([
    getCharism(nickname, server), getBelkoin(nickname)
  ])

  return {
    CHARISM: Number(charism),
    BELKOIN: Number(belkoin)
  }
}

export const balanceSchema = z.object({
  server: z.enum(["muffin", "bisquite"])
})