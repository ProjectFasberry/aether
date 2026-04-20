import Elysia, {  t } from "elysia"
import * as z from "zod/v4"
import { bisquite } from "#/shared/database/bisquite-db"
import { getDirection } from "#/utils/config/paginate"
import type { Lands, LandsPayload } from "@repo/shared/types/entities/land"
import { executeWithCursorPagination } from "kysely-paginate"
import { wrapMeta } from "#/utils/config/transforms"
import { withData, withMeta } from "#/shared/schemas"
import { landHelpers } from "#/utils/lands/lands-helpers"

const landsSchema = z.object({
  cursor: z.string().optional()
})

async function getLands({ cursor }: z.infer<typeof landsSchema>): Promise<LandsPayload> {
  const query = bisquite
    .selectFrom("lands_lands")
    .leftJoin("lands_banners", "lands_banners.ulid", "lands_lands.ulid")
    .select([
      "lands_lands.ulid",
      "lands_lands.members",
      "lands_lands.title",
      "lands_lands.name",
      "lands_lands.level",
      "lands_lands.stats",
      "lands_lands.type",
      "lands_lands.created_at",
      "lands_banners.banner_url"
    ])

  const direction = getDirection(false)

  const result = await executeWithCursorPagination(query, {
    perPage: 16,
    after: cursor,
    fields: [
      { key: "created_at", direction, expression: "created_at" }
    ],
    parseCursor: (cursor) => ({
      created_at: new Date(cursor.created_at)
    }),
  })

  const lands: Lands[] = result.rows.map(land => ({
    ...land,
    stats: land.stats ? JSON.parse(land.stats) : null,
    members: JSON.parse(land.members),
    details: {
      banner: land.banner_url ? landHelpers.getLandsUrl(land.banner_url) : null,
      gallery: []
    }
  }))

  return {
    data: lands,
    meta: wrapMeta(result)
  }
}

const landPayload = t.Object({
  ulid: t.String(),
  name: t.String(),
  title: t.Nullable(t.String()),
  level: t.Number(),
  created_at: t.Enum(t.Date(), t.String()),
  type: t.String(),
  stats: t.Object({
    kills: t.Number(),
    deaths: t.Number(),
    wins: t.Number(),
    defeats: t.Number(),
    captures: t.Number(),
  }),
  members: t.Record(t.String(), t.Number())
})

export const landsList = new Elysia()
  // .model({
  //   "lands-list": withData(
  //     t.Object({
  //       data: t.Array(landPayload),
  //       meta: withMeta
  //     })
  //   )
  // })
  .get("/list", async ({ query }) => {
    const data: LandsPayload = await getLands(query)
    return { data }
  }, {
    query: landsSchema,
    // response: {
    //   200: "lands-list"
    // }
  })