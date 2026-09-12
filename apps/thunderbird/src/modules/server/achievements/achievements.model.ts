import { luckperms } from "#/shared/database/luckperms-db"
import { getEnv } from "#/shared/env"
import { type Static, t } from "elysia"

export const achievementsMetaPayloadSchema = t.Object({
  total: t.Number(),
  achievementsTypes: t.Array(
    t.Object({
      key: t.String(),
      title: t.String()
    })
  )
})

export async function getAchievementsMeta(): Promise<Static<typeof achievementsMetaPayloadSchema>> {
  return {
    total: 2,
    achievementsTypes: [
      { key: "main", title: "Основное" },
      { key: "lobby", title: "Лобби" },
      { key: "bisquite", title: "Bisquite" },
    ]
  }
}

type AchievementDetails = {
  title: string,
  description: string,
  img: string | null
}

// example permission's name:
// lobby = "lobby.*"
// bisquite = "bisquite.*"
// main = "main.*"

export const ACHIEVEMENTS_RAW: Record<string, AchievementDetails> = {
  "lobby.secret.parkour": {
    title: "Секретный паркур",
    description: "Найти и пройти секретный паркур",
    img: "barrier.webp"
  },
  "main.integration.telegram": {
    title: "Вместе с Telegram",
    description: "Привязать свой аккаунт к Telegram",
    img: "allay_spawn_egg.webp"
  }
}

async function getAchievementDetails(achievement: string) {
  const v = ACHIEVEMENTS_RAW[achievement]

  const publicImage = `${getEnv().VOLUME_URL}/static/achievements/${v.img}`

  return { ...v, img: publicImage }
}

const achievementsSchema = t.UnionEnum(["lobby", "bisquite", "main"])
export const achievementsPayloadSchema = t.Array(
  t.Object({
    type: t.String(),
    details: t.Object({
      img: t.String(),
      title: t.String(),
      description: t.String()
    })
  })
)

type AchievementType = Static<typeof achievementsSchema>

export async function getAchievements(nickname: string): Promise<Static<typeof achievementsPayloadSchema>> {
  const query = await luckperms
    .selectFrom("luckperms_user_permissions")
    .innerJoin(
      "luckperms_players",
      "luckperms_players.uuid",
      "luckperms_user_permissions.uuid",
    )
    .select(["permission"])
    .where("luckperms_players.username", "=", nickname)
    .where(eb =>
      eb.and([
        eb.or(
          achievementsSchema.enum.map(option =>
            eb("luckperms_user_permissions.permission", "like", `${option}%`)
          )
        ),
        eb("luckperms_user_permissions.value", "=", true)
      ])
    )
    .execute()

  const res = await Promise.all(query.map(async perm => {
    const details = await getAchievementDetails(perm.permission)
    const firstKey = perm.permission.split(".")[0]

    return {
      type: firstKey as AchievementType,
      details
    }
  }))

  return res
}
