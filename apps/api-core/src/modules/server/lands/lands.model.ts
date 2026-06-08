import { bisquite } from "#/shared/database/bisquite-db";
import { wrapMeta } from "#/utils/config/transforms";
import { landHelpers } from "#/utils/lands/lands-helpers";
import { getPlayerUUID } from "#/utils/player/uuid";
import { type Static, t } from "elysia";
import { withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { executeWithCursorPagination } from "kysely-paginate";
import { general } from "#/shared/database/general-db";
import { sql, type SelectExpression } from "kysely";
import type { DB } from "@repo/shared/types/db/bisquite";
import { skinsService } from "../skin/index.model";
import { safeJsonParse } from "#/utils";

export const landSchema = t.Object({
  area: t.Nullable(
    t.Object({
      ulid: t.String(),
      holder: t.Object({
        roles: t.Array(t.Unknown()),
        trusted: t.Array(t.String()),
      }),
      settings: t.Array(t.String()),
      invites: t.Array(t.Unknown()),
      tax: t.Object({
        current: t.Number(),
        time: t.Number(),
        before: t.Number(),
      }),
      banned: t.Array(t.Unknown()),
    }),
  ),
  created_at: t.Union([
    t.String(), t.Date()
  ]),
  details: t.Object({
    banner: t.Nullable(t.String()),
    gallery: t.Array(t.String())
  }),
  type: t.String(),
  title: t.Nullable(t.String()),
  members: t.Array(
    t.Object({
      uuid: t.String(),
      nickname: t.String(),
      chunks: t.Number(),
      avatar: t.String()
    })
  ),
  name: t.String(),
  ulid: t.String(),
  level: t.Number(),
  limits: t.Nullable(
    t.Record(
      t.String(), t.Union([t.String(), t.Number()])
    )
  ),
  stats: t.Object({
    kills: t.Number(),
    deaths: t.Number(),
    wins: t.Number(),
    defeats: t.Number(),
    captures: t.Number()
  }),
  balance: t.Number(),
  chunks_amount: t.Nullable(t.Number()),
  areas_amount: t.Nullable(t.Number()),
  spawn: t.Nullable(
    t.Record(t.String(), t.Unknown())
  ),
})

export const landsByNicknameSchema = t.Object({
  exclude: t.Optional(
    t.String({ minLength: 1 })
  )
})

export const landsByPlayerSchema = t.Object({
  data: t.Array(
    t.Pick(landSchema, ["ulid", "type", "name", "title", "members", "details", "created_at"])
  ),
  meta: t.Object({
    count: t.Number()
  })
})

async function getBannerAndGalleryByLands(ulids: string[]) {
  const [bannerRows, galleryRows] = await Promise.all([
    bisquite
      .selectFrom("lands_banners")
      .select(['banner_url', 'ulid'])
      .where("ulid", "in", ulids)
      .execute(),
    bisquite
      .selectFrom('lands_gallery')
      .select(['url', 'ulid'])
      .where('ulid', 'in', ulids)
      .execute()
  ])

  return { bannerRows, galleryRows }
}

async function getMembersByUUIDs(uuids: string[]) {
  const membersList = await bisquite
    .selectFrom("lands_players")
    .select(["uuid", "name"])
    .where("uuid", "in", uuids)
    .execute();

  return membersList
}

type RawMembers = Record<string, { chunks: number }>;

const LANDS_FIELDS = [
  "lands_lands.ulid",
  "lands_lands.name",
  "lands_lands.type",
  "lands_lands.members",
  "lands_lands.created_at",
  "lands_lands.title"
]

export const LIMIT = 12;

export const landsByRandomSchema = landsByPlayerSchema

type Land = {
  type: string;
  title: string | null;
  area: string;
  ulid: string;
  created_at: Date;
  members: string;
  name: string;
  level: number;
  limits: string | null;
  stats: string | null;
  balance: number;
  spawn: string | null;
  server: string;
  category: string | null;
  icon: string | null;
  inbox: string | null;
  nation: string | null;
  shield: number;
  storage: string | null;
  world: string;
}

async function getLandsWithMembers(lands: Land[]) {
  const landsUlids = lands.map((land) => land.ulid)
  const { bannerRows, galleryRows } = await getBannerAndGalleryByLands(landsUlids)

  const detailsMap: Map<string, { banner: string | null, gallery: string[] }> = new Map()

  for (const id of landsUlids) {
    detailsMap.set(id, { banner: null, gallery: [] })
  }

  for (const row of bannerRows) {
    const target = detailsMap.get(row.ulid);

    if (target) {
      target.banner = landHelpers.getLandsUrl(row.banner_url)
    }
  }

  for (const row of galleryRows) {
    const target = detailsMap.get(row.ulid)

    if (target) {
      target.gallery.push(landHelpers.getLandsUrl(row.url))
    }
  }

  const allMemberUUIDs = new Set<string>();

  const landsWithMembers = lands.map((land) => {
    const parsed = safeJsonParse<RawMembers>(land.members)
    if (!parsed.ok) throw parsed.error

    const members = parsed.value

    for (const uuid in members) {
      allMemberUUIDs.add(uuid)
    }

    return { ...land, members }
  })

  const membersList = await getMembersByUUIDs(Array.from(allMemberUUIDs))
  const membersNicknamesByUUIDMap = new Map(membersList.map(m => [m.uuid, m.name]))
  const membersNicknames = Array.from(membersNicknamesByUUIDMap).map(([_, nickname]) => nickname)
  const membersAvatarsMap = await skinsService.players.getAvatar(membersNicknames);

  const data = landsWithMembers.map((land) => {
    const members = Object.entries(land.members).map(([uuid, { chunks }]) => {
      const nickname = membersNicknamesByUUIDMap.get(uuid) ?? "unknown"
      const avatar = membersAvatarsMap[nickname] ?? "unknown"

      return {
        uuid, nickname, chunks, avatar
      }
    })

    return {
      ...land,
      members,
      details: detailsMap.get(land.ulid)!,
    }
  })

  return data
}

export async function getRandomLands({ exclude, limit }: Static<typeof landsByNicknameSchema> & { limit?: number }) {
  let result: Static<typeof landsByRandomSchema> = { data: [], meta: { count: 0 } }

  let query = bisquite
    .selectFrom("lands_lands")
    // @ts-expect-error
    .select(LANDS_FIELDS)
    .orderBy(sql`RAND()`)
    .limit(limit ?? LIMIT)

  if (exclude) {
    query = query.where("lands_lands.ulid", "!=", exclude)
  }

  const lands = await query.execute();
  if (lands.length === 0) return result

  const data = await getLandsWithMembers(lands);

  result = {
    data, meta: { count: data.length }
  }

  return result
}

export async function getLandsByNickname(
  nickname: string,
  { exclude, limit }: Static<typeof landsByNicknameSchema> & { limit?: number }
): Promise<Static<typeof landsByPlayerSchema>> {
  const recipientUUID = await getPlayerUUID(nickname);

  let result: Static<typeof landsByPlayerSchema> = { data: [], meta: { count: 0 } }

  let query = bisquite
    .selectFrom("lands_lands")
    // @ts-expect-error
    .select(LANDS_FIELDS)
    .where("members", "like", `%${recipientUUID}%`)
    .limit(limit ?? LIMIT)

  if (exclude) {
    query = query.where("lands_lands.ulid", "!=", exclude)
  }

  const lands = await query.execute();
  if (lands.length === 0) return result

  const landsUlids = lands.map((land) => land.ulid)
  const { bannerRows, galleryRows } = await getBannerAndGalleryByLands(landsUlids)

  const detailsMap: Map<string, { banner: string | null, gallery: string[] }> = new Map()

  for (const id of landsUlids) {
    detailsMap.set(id, { banner: null, gallery: [] })
  }

  for (const row of bannerRows) {
    const target = detailsMap.get(row.ulid);

    if (target) {
      target.banner = landHelpers.getLandsUrl(row.banner_url)
    }
  }

  for (const row of galleryRows) {
    const target = detailsMap.get(row.ulid)

    if (target) {
      target.gallery.push(landHelpers.getLandsUrl(row.url))
    }
  }

  const allMemberUUIDs = new Set<string>();

  const landsWithMembers = lands.map((land) => {
    const parsed = safeJsonParse<RawMembers>(land.members)
    if (!parsed.ok) throw parsed.error

    const members = parsed.value

    for (const uuid in members) {
      allMemberUUIDs.add(uuid)
    }

    return { ...land, members }
  })

  const membersList = await getMembersByUUIDs(Array.from(allMemberUUIDs))
  const membersNicknamesByUUIDMap = new Map(membersList.map(m => [m.uuid, m.name]))
  const membersNicknames = Array.from(membersNicknamesByUUIDMap).map(([_, nickname]) => nickname)
  const membersAvatarsMap = await skinsService.players.getAvatar(membersNicknames);

  const data = landsWithMembers.map((land) => {
    const nickname = membersNicknamesByUUIDMap.get(recipientUUID)!;

    const members = Object.entries(land.members).map(([uuid, { chunks }]) => ({
      uuid, nickname, chunks, avatar: membersAvatarsMap[nickname]
    }))

    return {
      ...land,
      members,
      details: detailsMap.get(land.ulid)!,
    }
  })

  const meta = {
    count: data.length
  }

  result = { data, meta }

  return result
}

const BASE_FIELDS = [
  "area", "created_at", "details", "type", "title", "name", "level", "stats", "chunks_amount", "areas_amount", "ulid"
] as const

const OWNER_FIELDS: SelectExpression<DB, "lands_lands">[] = [
  "lands_lands.balance", "lands_lands.limits", "lands_lands.spawn"
]

export const landSingleSchema = t.Composite([
  t.Pick(landSchema, BASE_FIELDS),
  t.Object({
    members: t.Array(
      t.Object({
        nickname: t.String(),
        uuid: t.String(),
        role: t.Number(),
        avatar: t.String()
      })
    ),
    privated: t.Nullable(
      t.Pick(landSchema, ["spawn", "balance", "limits"])
    )
  })
])

export async function getLand(
  ulid: string,
  { initiator }: { initiator: string | null }
): Promise<Static<typeof landSingleSchema> | null> {
  let isMember = false;

  const landRow = await bisquite
    .selectFrom('lands_lands')
    .select(['members', "name"])
    .where('ulid', '=', ulid)
    .executeTakeFirstOrThrow();

  const membersObject = safeJsonParse<{ [key: string]: { chunks: number } }>(landRow.members);
  if (!membersObject.ok) {
    console.error(membersObject.error)
    return null;
  }

  const membersRaw = await bisquite
    .selectFrom('cmi_users')
    .select(['player_uuid as uuid', 'username as nickname'])
    .where('player_uuid', 'in', Object.keys(membersObject.value))
    .$narrowType<{ nickname: string, uuid: string }>()
    .execute()

  if (initiator) {
    if (membersRaw.some(m => m.nickname === initiator)) {
      isMember = true
    }
  }

  async function getMembers() {
    const avatarsMap = await skinsService.players.getAvatar(membersRaw.map(r => r.nickname));

    const data = membersRaw.map((member, idx) => ({
      uuid: member.uuid,
      nickname: member.nickname,
      chunks: 0,
      // 4 = owner, 1 = member
      role: idx === 0 ? 4 : 1,
      avatar: avatarsMap[member.nickname]
    }))

    return data
  }

  async function getBase() {
    const ownerFields = isMember ? OWNER_FIELDS : [];

    const query = await bisquite
      .selectFrom("lands_lands")
      .leftJoin("lands_lands_claims", "lands_lands_claims.land", "lands_lands.ulid")
      .select([
        "lands_lands.ulid",
        "lands_lands.name",
        "lands_lands.area",
        "lands_lands.type",
        "lands_lands.created_at",
        "lands_lands.title",
        "lands_lands_claims.chunks_amount",
        "lands_lands_claims.areas_amount",
        "lands_lands.stats",
        "lands_lands.level",
        ...ownerFields
      ])
      .where("lands_lands.ulid", "=", ulid)
      .groupBy([
        "lands_lands.ulid",
        "lands_lands.name",
        "lands_lands.area",
        "lands_lands.type",
        "lands_lands.created_at",
        "lands_lands.title",
        "lands_lands_claims.chunks_amount",
        "lands_lands_claims.areas_amount",
        "lands_lands.stats",
        "lands_lands.level",
        ...ownerFields
      ])
      .executeTakeFirst()

    return query ?? null;
  }

  async function getDetails() {
    const [bannerResult, galleryResult] = await Promise.all([
      bisquite
        .selectFrom("lands_banners")
        .select('banner_url as banner')
        .where("ulid", "=", ulid)
        .executeTakeFirst(),
      bisquite
        .selectFrom('lands_gallery')
        .select('url')
        .where('ulid', '=', ulid)
        .execute()
    ])

    const details = {
      banner: landHelpers.transformBanner(bannerResult?.banner),
      gallery: landHelpers.transformGallery(galleryResult)
    }

    return details;
  }

  const [base, members, details] = await Promise.all([
    getBase(), getMembers(), getDetails()
  ])
  if (!base || !members || !details) return null;

  let privated: Static<typeof landSingleSchema>["privated"] | null = null

  if (isMember) {
    privated = {
      spawn: base.spawn ? JSON.parse(base.spawn) : null,
      balance: base.balance,
      limits: base.limits ? JSON.parse(base.limits) : null,
    }
  }

  const result: Static<typeof landSingleSchema> = {
    ...base,
    members,
    details,
    chunks_amount: base.chunks_amount ?? 0,
    areas_amount: base.areas_amount ?? 0,
    stats: base.stats ? JSON.parse(base.stats) : null,
    area: JSON.parse(base.area),
    privated
  }

  return result
}

export const landsSchema = t.Optional(
  t.Object({
    cursor: t.Optional(t.String())
  })
)

export const landsListPayload = t.Object({
  data: t.Array(
    t.Pick(
      landSchema,
      ["ulid", "name", "title", "level", "created_at", "type", "stats", "members", "details"]
    )
  ),
  meta: withMeta
})

export async function getLands({
  cursor
}: Static<typeof landsSchema>): Promise<Static<typeof landsListPayload>> {
  const query = bisquite
    .selectFrom("lands_lands")
    .leftJoin("lands_banners", "lands_banners.ulid", "lands_lands.ulid")
    .select([
      "lands_lands.ulid",
      "lands_lands.name",
      "lands_lands.title",
      "lands_lands.level",
      "lands_lands.created_at",
      "lands_lands.type",
      "lands_lands.stats",
      "lands_lands.members",
      "lands_banners.banner_url",
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

  const parsedLands = result.rows.map(row => ({
    ...row,
    rmembers: JSON.parse(row.members) as Record<string, { chunks: number }>
  }));

  if (!parsedLands.length) {
    return { data: [], meta: wrapMeta(result) }
  }

  const allUUIDs = Array.from(
    new Set(
      parsedLands.flatMap(({ rmembers }) => Object.keys(rmembers))
    )
  )

  const playersList = await general
    .selectFrom("players")
    .select(["uuid", "nickname"])
    .where("uuid", "in", allUUIDs)
    .execute();

  const nameMap = new Map(playersList.map(p => [p.uuid, p.nickname]));
  const nicknames = Array.from(nameMap).map(([_, nickname]) => nickname);

  if (nicknames.length === 0) {
    return {
      data: [],
      meta: wrapMeta(result)
    };
  }

  const avatarsMap = await skinsService.players.getAvatar(nicknames);

  const data = parsedLands.map((land) => {
    const members = Object
      .entries(land.rmembers)
      .map(([uuid, { chunks }]) => {
        const nickname = nameMap.get(uuid)!

        return {
          uuid,
          nickname,
          chunks,
          avatar: avatarsMap[nickname]
        };
      })

    return {
      ...land,
      stats: land.stats ? JSON.parse(land.stats) : null,
      members,
      details: {
        banner: land.banner_url ? landHelpers.getLandsUrl(land.banner_url) : null,
        gallery: []
      }
    }
  })

  return {
    data,
    meta: wrapMeta(result)
  }
}
