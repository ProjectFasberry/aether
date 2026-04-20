import { withData } from "#/shared/schemas"
import type { PlayerLands } from "@repo/shared/types/entities/land"
import Elysia, { t } from "elysia"
import * as z from "zod/v4"
import { getLandsByNickname } from "./lands.model"

const landsByPlayerPayload = t.Object({
  members: t.Array(t.Object({
    uuid: t.String(),
    nickname: t.String(),
    chunks: t.Number(),
  })),
  created_at: t.Date(),
  title: t.Union([t.String(), t.Null()]),
  type: t.String(),
  name: t.String(),
  ulid: t.String(),
})

export const landsByPlayer = new Elysia()
  .model({
    "lands-by-player": withData(
      t.Object({
        data: t.Array(landsByPlayerPayload),
        meta: t.Object({
          count: t.Number()
        })
      })
    )
  })
  .get("/list/:nickname", async ({ query: { exclude }, params: { nickname } }) => {
    let lands = await getLandsByNickname(nickname)

    if (exclude) {
      lands = lands.filter(land => land.ulid !== exclude)
    }

    const data: PlayerLands = {
      data: lands,
      meta: {
        count: lands.length
      }
    }

    return { data }
  }, {
    query: z.object({
      exclude: z.string().min(1).optional()
    }),
    response: {
      200: "lands-by-player"
    }
  })