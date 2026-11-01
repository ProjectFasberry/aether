import { DateTime } from "#/helpers/typebox";
import { skinsService } from "#/shared/services/skins";
import { general } from "#/shared/database/general-db";
import { getEnv } from "#/shared/env";
import { metaSchema, searchQuerySchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { DEFAULT_HEAD, skinsHistorySchema } from "@repo/core/modules/skins";
import dayjs from "dayjs";
import { type Static, t } from "elysia";
import { sql } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";

export const privatedUserSchema = t.Object({
  nickname: t.String(),
  lower_case_nickname: t.String(),
  uuid: t.String(),
  created_at: t.Date(),
  avatar: t.String(),
  player: t.Nullable(
    t.Object({
      id: t.Number(),
    })
  ),
  role: t.Nullable(
    t.Object({
      id: t.Number(),
      name: t.String()
    })
  ),
  skin: t.Nullable(skinsHistorySchema)
})

export const privatedUsersSchema = t.Object({
  data: t.Array(privatedUserSchema),
  meta: withMeta
})

const USER_SORT = ["abc", "created_at", "role"] as const

const sortSchema = t.UnionEnum(USER_SORT, { default: USER_SORT[0] });

export const userListSchema = t.Composite([
  metaSchema,
  t.Object({
    sort: t.Optional(sortSchema),
    searchQuery: searchQuerySchema
  })
])

type RequestedFields = "created_at" | "nickname" | "role_id"

const EXPRESSIONS: Record<Static<typeof sortSchema>, RequestedFields> = {
  "abc": "nickname",
  "created_at": "created_at",
  "role": "role_id"
}

type RawPlayer = {
  nickname: string;
  lower_case_nickname: string;
  uuid: string;
  created_at: Date | string | null;
  id: number | null;
  role_id: number | null;
  role_name: string | null;
}

async function process(nicknames: string[]) {
  const skins = await skinsService.players.getCachedSkinPayloads(nicknames);

  const mapper = (user: RawPlayer): Static<typeof privatedUserSchema> => {
    const {
      id, role_id, role_name, nickname, uuid,
      created_at, lower_case_nickname
    } = user;

    const skin = skins[user.nickname];

    return {
      player: id ? { id } : null,
      avatar: skin?.[0].skin_head_url ?? DEFAULT_HEAD(getEnv().VOLUME_URL),
      skin,
      role: role_id ? {
        id: role_id,
        name: role_name ?? "unknown"
      } : null,
      nickname,
      uuid,
      created_at: created_at ? dayjs(created_at).toDate() : dayjs().toDate(),
      lower_case_nickname,
    }
  }

  return mapper
}

export async function getPlayer(nickname: string): Promise<Static<typeof privatedUserSchema> | null> {
  const query = await general
    .selectFrom("accounts")
    .leftJoin("players", "players.lower_case_nickname", "accounts.lower_nickname")
    .leftJoin("roles", "roles.id", "players.role_id")
    .select([
      "accounts.nickname as nickname",
      "accounts.created_at as created_at",
      "accounts.lower_nickname as lower_case_nickname",
      "accounts.uuid as uuid",
      "players.id",
      "roles.id as role_id",
      "roles.name as role_name"
    ])
    .where("accounts.lower_nickname", "=", nickname.toLowerCase())
    .executeTakeFirst()

  if (!query) return null;

  const mapper = await process([query.nickname])
  return mapper(query)
}

const fallbackMeta = { hasNextPage: false, hasPrevPage: false }
const fallbackPaginateResult = { data: [], meta: fallbackMeta }

export async function getPlayersList({
  asc, startCursor, searchQuery, endCursor, limit, sort
}: Static<typeof userListSchema>): Promise<Static<typeof privatedUsersSchema>> {
  let query = general
    .selectFrom("accounts")
    .leftJoin("players", "players.lower_case_nickname", "accounts.lower_nickname")
    .leftJoin("roles", "roles.id", "players.role_id")
    .select([
      "accounts.nickname as nickname",
      "accounts.created_at as created_at",
      "accounts.lower_nickname as lower_case_nickname",
      "accounts.uuid as uuid",
      "players.id",
      "roles.id as role_id",
      "roles.name as role_name"
    ])

  if (searchQuery) {
    query = query
      .where(sql<boolean>`"accounts"."nickname" % ${searchQuery}`)
      .orderBy(sql`"accounts"."nickname" <-> ${searchQuery}`, "asc")
  }

  const result = await executeWithCursorPagination(query, {
    after: endCursor,
    before: startCursor,
    perPage: limit,
    fields: [
      { expression: EXPRESSIONS[sort ?? USER_SORT[0]], direction: getDirection(asc) },
    ],
    /* Because the input is received as a timestamp in ms, but the cursor requires it in date format */
    parseCursor: (cursor) => ({
      nickname: cursor.nickname,
      created_at: new Date(Number(cursor.created_at)),
      role_id: Number(cursor.role_id)
    })
  })

  if (result.rows.length === 0) return fallbackPaginateResult;

  const mapper = await process(result.rows.map(r => r.nickname))
  const data = result.rows.map((user) => mapper(user))

  return { data, meta: wrapMeta(result) }
}
