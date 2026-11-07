import { skinsService } from "#/shared/services/skins";
import { general } from "#/shared/database/general-db";
import { getEnv } from "#/shared/env";
import { metaSchema, searchQuerySchema, withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { wrapMeta } from "#/utils/config/transforms";
import { DEFAULT_HEAD, skinsHistorySchema } from "@repo/core/modules/skins";
import dayjs from "dayjs";
import { type Static, t } from "elysia";
import { sql, type RawBuilder, type SqlBool } from "kysely";

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

type RawPlayer = {
  nickname: string;
  lower_case_nickname: string;
  uuid: string;
  created_at: Date | string | null;
  id: number | null;
  role_id: number | null;
  role_name: string | null;
  /** Trigram similarity of the nickname to the search query (search only). */
  rank?: number | null;
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
      avatar: skin?.[0]?.skin_head_url ?? DEFAULT_HEAD(getEnv().VOLUME_URL),
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

/**
 * Opaque keyset cursor. `kysely-paginate` encodes the raw column values (a
 * `Date` becomes an ISO string), which the previous parser read back as
 * milliseconds - page two of the default sort died on an Invalid Date. The
 * cursor is built here instead, so the payload matches what the query expects.
 *
 * It always carries a nickname: every order ends with `accounts.nickname`, so
 * rows with an equal primary key are still strictly ordered.
 */
type UsersCursor = {
  nickname: string;
  created_at?: string;
  role_sort?: number;
  rank?: number;
}

function encodeCursor(payload: UsersCursor): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(value: string): UsersCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<UsersCursor>;

    if (typeof parsed.nickname !== "string" || parsed.nickname.length === 0) return null;
    if (parsed.created_at !== undefined && Number.isNaN(Date.parse(parsed.created_at))) return null;
    if (parsed.role_sort !== undefined && typeof parsed.role_sort !== "number") return null;
    if (parsed.rank !== undefined && typeof parsed.rank !== "number") return null;

    return parsed as UsersCursor;
  } catch {
    return null;
  }
}

function cursorFor(row: RawPlayer, sort: Static<typeof sortSchema>, searching: boolean): UsersCursor {
  if (searching) {
    return { rank: Number(row.rank ?? 0), nickname: row.nickname };
  }

  switch (sort) {
    case "created_at":
      return {
        // pg returns timestamptz as a Date; keep the cursor value in the same
        // shape the next query binds (a Date), not a wall-clock number.
        created_at: new Date(row.created_at as Date | string).toISOString(),
        nickname: row.nickname,
      };
    case "role":
      return { role_sort: row.role_id ?? 0, nickname: row.nickname };
    case "abc":
    default:
      return { nickname: row.nickname };
  }
}

/**
 * Rows that come strictly after the cursor for the active ordering.
 *
 * The order is always `<primary> <direction>, nickname asc`, so the condition
 * is `(primary op value) OR (primary = value AND nickname > cursor.nickname)`.
 * A plain tuple comparison would compare the nickname in the primary
 * direction, which is wrong for `desc` orderings.
 */
function applyCursor(query: any, primary: RawBuilder<unknown>, direction: "asc" | "desc", cursor: UsersCursor) {
  const value =
    cursor.rank !== undefined ? cursor.rank :
      cursor.created_at !== undefined ? new Date(cursor.created_at) :
        cursor.role_sort !== undefined ? cursor.role_sort :
          null;

  if (value === null) {
    return query.where("accounts.nickname", direction === "asc" ? ">" : "<", cursor.nickname);
  }

  const comparison = direction === "asc" ? sql`>` : sql`<`;

  return query.where(sql<SqlBool>`(
    ${primary} ${comparison} ${value}
    or (${primary} = ${value} and "accounts"."nickname" > ${cursor.nickname})
  )`);
}

const fallbackMeta = {
  hasNextPage: false as boolean,
  hasPrevPage: false as boolean,
  startCursor: undefined as string | undefined,
  endCursor: undefined as string | undefined,
};

export async function getPlayersList({
  asc, startCursor, searchQuery, endCursor, limit, sort
}: Static<typeof userListSchema>): Promise<Static<typeof privatedUsersSchema> | null> {
  const order = sort ?? USER_SORT[0];
  const direction = getDirection(asc);
  const searching = Boolean(searchQuery);

  // Backward pagination (`before`) is not used by the panel; only forward
  // cursors are accepted and `startCursor` is returned for completeness.
  const cursor = endCursor ? decodeCursor(endCursor) : null;
  if (endCursor && !cursor) return null;

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
      .select(sql<number>`similarity("accounts"."nickname", ${searchQuery})`.as("rank"))
      .where(sql<SqlBool>`"accounts"."nickname" % ${searchQuery}`)
  }

  let primary: RawBuilder<unknown>;
  let primaryDirection: "asc" | "desc" = direction;

  if (searching) {
    // Search always ranks by relevance; the sort selector would only make the
    // result harder to predict, and the cursor must carry the rank anyway.
    primary = sql`similarity("accounts"."nickname", ${searchQuery})`;
    primaryDirection = "desc";
  } else {
    switch (order) {
      case "created_at":
        primary = sql`"accounts"."created_at"`;
        break;
      case "role":
        // Users without a role sort first/last with a real value instead of a
        // NULL the cursor cannot encode.
        primary = sql`coalesce("roles"."id", 0)`;
        break;
      case "abc":
      default:
        primary = sql`"accounts"."nickname"`;
        break;
    }
  }

  if (cursor) {
    query = applyCursor(query, primary, primaryDirection, cursor);
  }

  query = query.orderBy(primary, primaryDirection);
  if (order !== "abc" || searching) {
    query = query.orderBy("accounts.nickname", "asc");
  }

  const rows = await query.limit(limit + 1).execute() as RawPlayer[];
  const hasNextPage = rows.length > limit;
  if (hasNextPage) rows.pop();

  if (rows.length === 0) {
    return { data: [], meta: fallbackMeta };
  }

  const mapper = await process(rows.map(r => r.nickname))
  const data = rows.map((user) => mapper(user))

  return {
    data,
    meta: wrapMeta({
      hasNextPage,
      hasPrevPage: Boolean(cursor),
      startCursor: encodeCursor(cursorFor(rows[0], order, searching)),
      endCursor: encodeCursor(cursorFor(rows[rows.length - 1], order, searching)),
    }),
  }
}
