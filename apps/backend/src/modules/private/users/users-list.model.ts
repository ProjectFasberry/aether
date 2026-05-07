import { DEFAULT_HEAD, getCachedSkinPayloads, skinsHistorySchema } from "#/modules/server/skin/skin.model";
import { general } from "#/shared/database/general-db";
import { metaSchema, searchQuerySchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import dayjs from "dayjs";
import { type Static, t } from "elysia";
import { sql } from "kysely";
import { executeWithCursorPagination } from "kysely-paginate";

export const privatedUserSchema = t.Object({
  nickname: t.String(),
  lower_case_nickname: t.String(),
  uuid: t.String(),
  created_at: t.String(),
  premium_uuid: t.Nullable(t.String()),
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
  created_at: string | null;
  premium_uuid: string | null;
  id: number | null;
  role_id: number | null;
  role_name: string | null;
}

async function process(nicknames: string[]) {
  const skins = await getCachedSkinPayloads(nicknames);

  const mapper = (user: RawPlayer): Static<typeof privatedUserSchema> => {
    const {
      id, role_id, role_name, nickname, uuid, 
      premium_uuid, created_at, lower_case_nickname
    } = user;

    const skin = skins[user.nickname];

    return {
      player: id ? { id } : null,
      avatar: skin?.[0].skin_head_url ?? DEFAULT_HEAD,
      skin,
      role: role_id ? {
        id: role_id,
        name: role_name ?? "unknown"
      } : null,
      nickname,
      uuid,
      premium_uuid,
      created_at: dayjs(created_at).toISOString(),
      lower_case_nickname,
    }
  }

  return mapper
}

export async function getPlayer(nickname: string): Promise<Static<typeof privatedUserSchema> | null> {
  const query = await general
    .selectFrom("AUTH")
    .leftJoin("players", "players.nickname", "AUTH.NICKNAME")
    .leftJoin("roles", "roles.id", "players.role_id")
    .select([
      "AUTH.NICKNAME as nickname",
      "AUTH.REGDATE as created_at",
      "AUTH.LOWERCASENICKNAME as lower_case_nickname",
      "AUTH.UUID as uuid",
      "AUTH.PREMIUMUUID as premium_uuid",
      "players.id",
      "roles.id as role_id",
      "roles.name as role_name"
    ])
    .where("AUTH.NICKNAME", "=", nickname)
    .$narrowType<{ uuid: string }>()
    .executeTakeFirst()

  if (!query) return null;

  const mapper = await process([query.nickname])
  return mapper(query)
}

export async function getPlayersList({
  asc, startCursor, searchQuery, endCursor, limit, sort
}: Static<typeof userListSchema>): Promise<Static<typeof privatedUsersSchema>> {
  let query = general
    .selectFrom("AUTH")
    .leftJoin("players", "players.nickname", "AUTH.NICKNAME")
    .leftJoin("roles", "roles.id", "players.role_id")
    .select([
      "AUTH.NICKNAME as nickname",
      "AUTH.REGDATE as created_at",
      "AUTH.LOWERCASENICKNAME as lower_case_nickname",
      "AUTH.UUID as uuid",
      "AUTH.PREMIUMUUID as premium_uuid",
      "players.id",
      "roles.id as role_id",
      "roles.name as role_name"
    ])
    .$narrowType<{ uuid: string }>()

  if (searchQuery) {
    query = query
      .where(sql<boolean>`"AUTH"."NICKNAME" % ${searchQuery}`)
      .orderBy(sql`"AUTH"."NICKNAME" <-> ${searchQuery}`, "asc")
  }

  const config = {
    after: endCursor!,
    before: startCursor!,
    perPage: limit,
    direction: getDirection(asc),
    expression: EXPRESSIONS[sort ?? USER_SORT[0]]
  }

  const result = await executeWithCursorPagination(query, {
    ...config,
    fields: [
      { expression: config.expression, direction: config.direction }
    ],
    parseCursor: (cursor) => ({
      nickname: cursor.nickname,
      created_at: dayjs(cursor.created_at).toISOString(),
      role_id: Number(cursor.role_id)
    })
  })

  const mapper = await process(result.rows.map(r => r.nickname))
  const data = result.rows.map((user) => mapper(user))

  return { data, meta: wrapMeta(result) }
}