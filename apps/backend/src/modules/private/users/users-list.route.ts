import Elysia, { type Static, t } from "elysia";
import type { PrivatedUsersPayload } from "@repo/shared/types/entities/other";
import { getDirection } from "#/utils/config/paginate";
import { general } from "#/shared/database/general-db";
import { sql } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { metaSchema, searchQuerySchema } from "#/shared/schemas";
import { validatePermission } from "#/lib/middlewares/validators";
import { Permissions } from "#/shared/constants/permissions";
import { getPlayerAvatar } from "#/modules/server/skin/skin.model";

const USER_SORT = ["abc", "created_at", "role"] as const

const sortSchema = t.UnionEnum(USER_SORT, { default: USER_SORT[0] });

const userListSchema = t.Composite([
  metaSchema,
  t.Object({
    sort: t.Optional(sortSchema),
    searchQuery: searchQuerySchema
  })
])

type UserListSchema = Static<typeof userListSchema>
type RequestedFields = "created_at" | "nickname" | "role_id"

const EXPRESSIONS: Record<Static<typeof sortSchema>, RequestedFields> = {
  "abc": "nickname",
  "created_at": "created_at",
  "role": "role_id"
}

async function getPlayersList({ asc, startCursor, searchQuery, endCursor, limit, sort }: UserListSchema) {
  const direction = getDirection(asc);

  let query = general
    .selectFrom("players")
    // .innerJoin("players_status", "players_status.nickname", "players.nickname") // todo: impl player status table
    .innerJoin("roles", "roles.id", "players.role_id")
    .select([
      "players.id",
      "players.created_at as created_at",
      "players.nickname as nickname",
      "players.lower_case_nickname",
      "players.premium_uuid",
      "players.uuid",
      "roles.id as role_id",
      "roles.name as role_name"
    ])

  if (searchQuery) {
    const searchQueryLower = searchQuery.toLowerCase();

    query = query
      .where(
        sql<boolean>`players.nickname ILIKE ${`%${searchQueryLower}%`} 
          OR players.nickname_tsv @@ websearch_to_tsquery('simple', ${searchQueryLower})`
      )
      .orderBy(
        sql`ts_rank_cd(players.nickname_tsv, websearch_to_tsquery('simple', ${searchQueryLower}))`,
        "desc"
      );
  }

  const expression = EXPRESSIONS[sort!];

  const config = {
    after: endCursor!,
    before: startCursor!,
    perPage: limit!,
  }

  const result = await executeWithCursorPagination(query, {
    ...config,
    fields: [
      { expression, direction }
    ],
    parseCursor: (cursor) => {
      const payload = {
        nickname: cursor.nickname,
        created_at: new Date(cursor.created_at),
        role_id: Number(cursor.role_id)
      }

      return payload
    }
  })

  const data = await Promise.all(
    result.rows.map((async (user) => ({
      ...user,
      status: "default" as "banned" | "default" | "muted",
      avatar: await getPlayerAvatar(user.nickname)
    })))
  )

  return {
    data,
    meta: wrapMeta(result)
  }
}

export const playersList = new Elysia()
  .use(validatePermission(Permissions.get("PLAYERS.READ")))
  .get("/list", async ({ query }) => {
    const data: PrivatedUsersPayload = await getPlayersList(query);
    return { data }
  }, {
    query: userListSchema
  })