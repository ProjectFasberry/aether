import { bisquite } from "#/shared/database/bisquite-db";
import { safeJsonParse, wrapMeta } from "#/utils/config/transforms";
import { landHelpers } from "#/utils/lands/lands-helpers";
import { getPlayerUUID } from "#/utils/player/uuid";
import { type Static, t } from "elysia";
import { getPlayerAvatar } from "../skin/skin.model";
import { withMeta } from "#/shared/schemas";
import { getDirection } from "#/utils/config/paginate";
import { executeWithCursorPagination } from "kysely-paginate";
import { general } from "#/shared/database/general-db";

type LandMember = Record<string, { chunks: number }>

const { getLandsUrl } = landHelpers

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
  limits: t.Nullable(t.Array(t.String())),
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
  spawn: t.Nullable(t.String()),
})

export const landsByNicknameSchema = t.Object({
  exclude: t.Optional(t.String({ minLength: 1 }))
})

export const landsByPlayerSchema = t.Object({
  data: t.Array(
    t.Pick(
      landSchema,
      ["ulid", "type", "name", "title", "members", "details", "created_at"]
    )
  ),
  meta: t.Object({
    count: t.Number()
  })
})

export async function getLandsByNickname(
  nickname: string,
  { exclude }: Static<typeof landsByNicknameSchema>
): Promise<Static<typeof landsByPlayerSchema>> {
  const uuid = await getPlayerUUID(nickname)

  let lands = await bisquite
    .selectFrom("lands_lands")
    .select([
      "lands_lands.ulid",
      "lands_lands.name",
      "lands_lands.type",
      "lands_lands.members",
      "lands_lands.created_at",
      "lands_lands.title",
    ])
    .where("members", "like", `%${uuid}%`)
    .execute();

  if (!lands.length) {
    return {
      data: [],
      meta: { count: 0 }
    }
  }

  if (exclude) {
    lands = lands.filter(land => land.ulid !== exclude)
  }

  const ulids = lands.map(l => l.ulid)

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

  const detailsMap: Map<string, { banner: string | null, gallery: string[] }> = new Map()

  for (const id of ulids) {
    detailsMap.set(id, { banner: null, gallery: [] })
  }

  for (const row of bannerRows) {
    const target = detailsMap.get(row.ulid);

    if (target) {
      target.banner = getLandsUrl(row.banner_url)
    }
  }

  for (const row of galleryRows) {
    const target = detailsMap.get(row.ulid)

    if (target) {
      target.gallery.push(getLandsUrl(row.url))
    }
  }

  const allMemberUUIDs: Set<string> = new Set();

  const parsedLands = lands.map(l => {
    const parsed = safeJsonParse<LandMember>(l.members)
    if (!parsed.ok) throw parsed.error

    const members = parsed.value

    for (const uid in members) {
      allMemberUUIDs.add(uid)
    }

    return { ...l, members }
  })

  const membersList = await bisquite
    .selectFrom("lands_players")
    .select(["uuid", "name"])
    .where("uuid", "in", Array.from(allMemberUUIDs))
    .execute();

  const nameMap = new Map(membersList.map(m => [m.uuid, m.name]))

  const data = await Promise.all(
    parsedLands.map(async (land) => {
      const nickname = nameMap.get(uuid)!;

      const members = await Promise.all(
        Object.entries(land.members).map(async ([uuid, data]) => ({
          uuid,
          nickname,
          chunks: data.chunks,
          avatar: await getPlayerAvatar(nickname)
        }))
      )

      return {
        ...land,
        members,
        details: detailsMap.get(land.ulid)!,
      }
    })
  )

  return {
    data,
    meta: {
      count: data.length
    }
  }
}

const { transformBanner, transformGallery } = landHelpers

export const landPayload = t.Composite([
  t.Pick(
    landSchema,
    [
      "area", "created_at", "details", "type", "title", "name", "level", "limits",
      "stats", "balance", "chunks_amount", "areas_amount", "ulid", "spawn"
    ]
  ),
  t.Object({
    members: t.Array(
      t.Object({
        nickname: t.String(),
        uuid: t.String(),
        role: t.Number(),
        avatar: t.String()
      })
    ),
  })
])

export async function getLand(
  ulid: string,
  { initiator }: { initiator: string | null }
): Promise<Static<typeof landPayload> | null> {
  let isOwner = false;

  const landRow = await bisquite
    .selectFrom('lands_lands')
    .select(['members', "name"])
    .where('ulid', '=', ulid)
    .executeTakeFirstOrThrow();

  const membersObject = JSON.parse(landRow.members ?? '{}');
  const memberUUIDs = Object.keys(membersObject);

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
    banner: transformBanner(bannerResult?.banner),
    gallery: transformGallery(galleryResult)
  }

  async function getMembers() {
    if (memberUUIDs.length === 0) return [];

    const members = await bisquite
      .selectFrom('cmi_users')
      .select([
        'player_uuid as uuid',
        'username as nickname'
      ])
      .where('player_uuid', 'in', memberUUIDs)
      .execute()

    const isMember = members.some(m => m.nickname === initiator)

    if (initiator && isMember) {
      isOwner = true
    }

    const data = await Promise.all(
      members.map(async (member, idx) => ({
        uuid: member.uuid as string,
        nickname: member.nickname as string,
        chunks: 0,
        // 4 type = owner
        // 1 type = member
        role: idx === 0 ? 4 : 1,
        avatar: await getPlayerAvatar(member.nickname!)
      }))
    )

    return data
  }

  async function getMain() {
    let OWNER_FIELDS: string[] = [];

    if (isOwner) {
      OWNER_FIELDS = [
        "lands_lands.balance",
        "lands_lands.limits",
        "lands_lands.spawn"
      ]
    }

    const query = await bisquite
      .selectFrom("lands_lands")
      .leftJoin("lands_lands_claims", "lands_lands_claims.land", "lands_lands.ulid")
      // OWNER_FIELDS
      // @ts-expect-error
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
        ...OWNER_FIELDS
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
      ])
      .executeTakeFirst()

    return query ?? null;
  }

  const [main, members] = await Promise.all([
    getMain(), getMembers()
  ])

  if (!main || !members) return null;

  const result = {
    ...main,
    members,
    details,
    chunks_amount: main.chunks_amount ?? 0,
    areas_amount: main.areas_amount ?? 0,
    stats: main.stats ? JSON.parse(main.stats) : null,
    area: isOwner ? JSON.parse(main.area as string) : null,
    spawn: isOwner ? main.spawn : null,
    balance: isOwner ? main.balance : 0,
    limits: isOwner ? main.limits ? JSON.parse(main.limits) : null : null,
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

export async function getLands({ cursor }: Static<typeof landsSchema>): Promise<Static<typeof landsListPayload>> {
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
    return {
      data: [],
      meta: wrapMeta(result)
    }
  }

  const allUuids = [
    ...new Set(parsedLands.flatMap(l => Object.keys(l.rmembers)))
  ];

  const playersList = await general
    .selectFrom("players")
    .select(["uuid", "nickname"])
    .where("uuid", "in", allUuids)
    .execute();

  const nameMap = new Map(playersList.map(p => [p.uuid, p.nickname]));

  const lands = await Promise.all(
    parsedLands.map(async (land) => {
      const members = await Promise.all(
        Object.entries(land.rmembers).map(async ([uuid, data]) => {
          const nickname = nameMap.get(uuid) || "Unknown";

          return {
            uuid,
            nickname,
            chunks: data.chunks,
            avatar: await getPlayerAvatar(nickname)
          };
        })
      );

      return {
        ...land,
        rmembers: undefined,
        stats: land.stats ? JSON.parse(land.stats) : null,
        members,
        details: {
          banner: land.banner_url ? landHelpers.getLandsUrl(land.banner_url) : null,
          gallery: []
        }
      }
    })
  )

  return {
    data: lands,
    meta: wrapMeta(result)
  }
}