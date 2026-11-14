import pLimit from "p-limit";
import { sql } from "kysely";
import { type Static, t } from "elysia";
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createHash } from "node:crypto";
import { getStaticUrl } from "../../utils/url";
import { safeJsonParse } from "@repo/shared/utils";
import { buildRedisKey } from "../../utils/redis";
import { createPlayerService } from "../player";
import { SUBJECTS } from "@repo/shared/constants/subjects"
import { BUCKETS } from "@repo/shared/constants/buckets";
import { logger } from "@repo/shared/utils/logger";
import { canUseSkin, type SkinOwner } from "./ownership";
import type RedisClient from "ioredis";
import type { Kysely, Transaction } from "kysely";
import type { DB as generalDb } from "@gen/db/general";
import type { DB as skinsDb } from "@gen/db/skins"
import type { Client as MinioClient } from "minio"
import type { NatsConnection } from "@nats-io/nats-core"

/** Bumped whenever the cached payload shape changes. */
const CACHE_VERSION = "v4";
/** Hard TTL: an entry older than this is rebuilt on the next read. */
const CACHE_TTL_SECONDS = 24 * 60 * 60;
/** Soft TTL: a read after this age refreshes the entry in the background. */
const CACHE_REFRESH_MS = 60 * 60 * 1000;
/** Guards a single rebuild per nickname across processes. */
const CACHE_LOCK_TTL_MS = 10_000;
/** Highest applied file in `pkgs/config-drizzle/drizzle/skins/`. */
const SKINS_SCHEMA_VERSION = 3;

export const getSkinsHistoryCacheRedisKey = (nickname: string) => buildRedisKey({
  name: `players:skins:${CACHE_VERSION}:${nickname.toLowerCase()}`,
  target: "internal",
});


export const skinHistorySingleSchema = t.Object({
  skin_identifier: t.String(),
  skin_variant: t.Nullable(t.String()),
  timestamp: t.Number(),
  skin_url: t.Nullable(t.String()),
  skin_head_url: t.Nullable(t.String())
})
export type SkinsHistorySingle = Static<typeof skinHistorySingleSchema>

export const skinsHistorySchema = t.Array(skinHistorySingleSchema)
export type SkinsHistory = Static<typeof skinsHistorySchema>;

const getDefaultSkinHeadUrl = (identifier: string) => `https://mc-heads.net/avatar/${identifier}`
const isCustomSkin = (identifier: string) => identifier.startsWith("sr")

export const DEFAULT_SKIN_PAGE_LIMIT = 50
export const MAX_SKIN_PAGE_LIMIT = 100

/** Cursor is a plain offset; the history is small and already ordered. */
export const paginateSkins = <T>(
  data: T[],
  cursor?: string | null,
  limit?: number | string | null,
): { data: T[], nextCursor: string | null } => {
  const parsed = Number(cursor ?? 0)
  const start = Number.isInteger(parsed) && parsed > 0 ? parsed : 0
  const parsedLimit = Number(limit ?? DEFAULT_SKIN_PAGE_LIMIT)
  const size = Math.min(
    Math.max(Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : DEFAULT_SKIN_PAGE_LIMIT, 1),
    MAX_SKIN_PAGE_LIMIT,
  )
  const page = data.slice(start, start + size)
  const next = start + size < data.length ? String(start + size) : null

  return { data: page, nextCursor: next }
}

export const skinHeadKey = (value: string) =>
  createHash("sha256").update(value).digest("hex")

export const isAllowedHost = (url: string, hosts: string[]): boolean => {
  try {
    const { hostname } = new URL(url)

    return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

type PlayerSkinPayload = Pick<SkinsHistorySingle, "skin_identifier" | "skin_variant" | "timestamp"> & {
  value: string
}

export type Skin = {
  textures: {
    SKIN: { url: string, metadata: { model: string } }
  },
  profileName: string,
  profileId: string
}

export const DEFAULT_SKIN_VARIANT = "CLASSIC"
export const DEFAULT_HEAD_PATH = "fallback/steve_head.png"
export const DEFAULT_SKIN = "fallback/steve_skin.png"
export const DEFAULT_HEAD = (volumeUrl: string) => getStaticUrl(DEFAULT_HEAD_PATH, volumeUrl)

/** Cache envelope; arrays are accepted for entries written before `CACHE_VERSION`. */
type CachedSkinsEntry = {
  updatedAt: number,
  data: SkinsHistory
}

export const parseCachedEntry = (raw: string | null | undefined): CachedSkinsEntry | null => {
  if (!raw) return null;

  const parsed = safeJsonParse<CachedSkinsEntry | SkinsHistory>(raw)
  if (!parsed.ok) return null;

  if (Array.isArray(parsed.value)) return { updatedAt: 0, data: parsed.value };

  return parsed.value
}

/**
 * A custom skin can be stored once per signature, while `sr_url_skins` keeps a
 * row per upload. When the same texture was uploaded with different variants we
 * prefer the variant the player already wears, then a stable alphabetical pick.
 */
export const pickSkinVariant = (
  variants: Array<string | null | undefined>,
  preferred?: string | null,
): string => {
  const unique = [...new Set(variants.filter((variant): variant is string => Boolean(variant)))].sort()

  if (preferred && unique.includes(preferred)) return preferred;

  return unique[0] ?? preferred ?? DEFAULT_SKIN_VARIANT
}

/** Hosts the head renderer may fetch a texture from. */
const SKIN_HOSTS = (Bun.env["SKIN_DOMAINS"] ?? "textures.minecraft.net")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean)

const isAllowedSkinHost = (url: string): boolean => isAllowedHost(url, SKIN_HOSTS)

type SkinsParams = {
  databases: {
    general: Kysely<generalDb>,
    skins: Kysely<skinsDb>
  }
  redis: () => RedisClient,
  config: {
    VOLUME_URL: string,
    /** Public API origin; avatars are private and served through `/avatars/:file`. */
    API_URL: string,
  },
  /**
   * When set, the game server persists the selection (single writer). Without
   * it, the service keeps the legacy database write.
   */
  applySelection?: (args: {
    nickname: string,
    uuid: string,
    skinName: string,
  }) => Promise<void>
}

type SkinsExecutor = Kysely<skinsDb> | Transaction<skinsDb>

/** Ownership lives in a side table, so the introspected schema stays untouched. */
export const getSkinOwner = async (
  db: SkinsExecutor,
  skinName: string,
): Promise<SkinOwner | null> => {
  const result = await sql<SkinOwner>`
    select owner_uuid, is_public
    from skin_owners
    where skin_name = ${skinName}
    limit 1
  `.execute(db)

  return result.rows[0] ?? null
}

export const recordSkinAudit = async (
  db: SkinsExecutor,
  entry: {
    actorUuid: string,
    targetUuid: string | null,
    action: "select" | "upload" | "delete",
    skinName: string,
  },
): Promise<void> => {
  await sql`
    insert into skin_audit (actor_uuid, target_uuid, action, skin_name, created_at)
    values (
      ${entry.actorUuid},
      ${entry.targetUuid},
      ${entry.action},
      ${entry.skinName},
      ${Math.floor(Date.now() / 1000)}
    )
  `.execute(db)
}

type HeadJob = {
  hash: string,
  skin_url: string,
  attempts: number,
}

/** A head is queued before the inline render, so a crash leaves a retryable row. */
const enqueueHeadJob = async (
  db: SkinsExecutor,
  hash: string,
  skinUrl: string,
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000)

  await sql`
    insert ignore into skin_head_jobs
      (hash, skin_url, status, attempts, created_at, updated_at)
    values (${hash}, ${skinUrl}, 'pending', 0, ${now}, ${now})
  `.execute(db)
}

const finishHeadJob = async (db: SkinsExecutor, hash: string): Promise<void> => {
  await sql`delete from skin_head_jobs where hash = ${hash}`.execute(db)
}

export const createSkinsService = ({ redis, databases, config, applySelection }: SkinsParams) => {
  const { general: generalDb, skins: skinsDb } = databases;

  const getHeadUrl = (hash: string) =>
    `${config.API_URL.replace(/\/$/, "")}/${BUCKETS.AVATARS}/heads-${hash}.png`

  const defaultHead = DEFAULT_HEAD(config.VOLUME_URL);
  const defaultSkinUrl = getStaticUrl(DEFAULT_SKIN, config.VOLUME_URL);

  const fallbackSkin = (): SkinsHistorySingle => ({
    skin_identifier: "fallback",
    skin_variant: DEFAULT_SKIN_VARIANT,
    timestamp: 0,
    skin_url: defaultSkinUrl,
    skin_head_url: defaultHead,
  });

  /**
   * Redis is a cache, not a dependency: a failed read degrades to a database
   * read instead of failing the request.
   */
  const readCachedEntry = async (nickname: string): Promise<CachedSkinsEntry | null> => {
    try {
      return parseCachedEntry(await redis().get(getSkinsHistoryCacheRedisKey(nickname)))
    } catch (e) {
      logger.warn({ message: "Skins cache read failed", nickname, error: e })
      return null
    }
  }

  const writeCachedEntry = async (nickname: string, data: SkinsHistory): Promise<void> => {
    const entry: CachedSkinsEntry = { updatedAt: Date.now(), data }

    await redis().set(
      getSkinsHistoryCacheRedisKey(nickname),
      JSON.stringify(entry),
      "EX",
      CACHE_TTL_SECONDS,
    )
  }

  const playerService = createPlayerService({
    generalDb, redis
  })

  type CachedSkinPayload = Record<string, SkinsHistory | null>;

  const players = {
    /**
     * Returns a map of nicknames to cached skin payloads
     */
    async getCachedSkinPayloads(nicknames: string[]): Promise<CachedSkinPayload> {
      const keys = nicknames.map(getSkinsHistoryCacheRedisKey);
      if (keys.length === 0) return {};

      let resultsStr: Array<string | null>
      try {
        resultsStr = await redis().mget(...keys);
      } catch (e) {
        logger.warn({ message: "Skins cache bulk read failed", error: e })
        resultsStr = keys.map(() => null)
      }

      const map: CachedSkinPayload = Object.create(null)

      for (let i = 0; i < resultsStr.length; i++) {
        map[nicknames[i]] = parseCachedEntry(resultsStr[i])?.data ?? null
      }

      return map;
    },
    /**
     * Returns a map of nicknames to avatar URLs
     */
    async getAvatar(nicknames: string[]): Promise<Record<string, string>> {
      const result = await this.getCachedSkinPayloads(nicknames)
      const map: Record<string, string> = Object.create(null)

      for (let i = 0; i < nicknames.length; i++) {
        const name = nicknames[i];
        const skinData = result[name];

        if (skinData && skinData.length > 0) {
          map[name] = skinData[0].skin_head_url ?? defaultHead
        } else {
          map[name] = defaultHead
        }
      }

      return map
    }
  }

  const player = {
    /**
     * Returns the avatar URL for a given nickname
     */
    async getAvatar(nickname: string): Promise<string> {
      const result = await readCachedEntry(nickname)
      return result?.data[0]?.skin_head_url ?? defaultHead
    }
  }

  /**
   * Removes one custom skin from a player: history row, ownership, current
   * selection and the asset when nothing else references it. Returns false when
   * the skin is not part of that player's history.
   */
  const removePlayerSkin = async (
    trx: Transaction<skinsDb>,
    uuid: string,
    skinName: string,
    actorUuid: string,
  ): Promise<boolean> => {
    const row = await trx
      .selectFrom("sr_custom_skins")
      .select(["name", "signature"])
      .where(sql`lower(sr_custom_skins.name)`, "=", skinName.toLowerCase())
      .executeTakeFirst()

    if (!row) return false

    const canonical = row.name
    const [history, current] = await Promise.all([
      trx
        .selectFrom("sr_player_history")
        .select("uuid")
        .where("uuid", "=", uuid)
        .where("skin_identifier", "=", canonical)
        .executeTakeFirst(),
      trx
        .selectFrom("sr_players")
        .select("skin_identifier")
        .where("uuid", "=", uuid)
        .executeTakeFirst(),
    ])

    const isCurrent = current?.skin_identifier?.toLowerCase() === canonical.toLowerCase()

    if (!history && !isCurrent) return false

    if (history) {
      await trx
        .deleteFrom("sr_player_history")
        .where("uuid", "=", uuid)
        .where("skin_identifier", "=", canonical)
        .execute()
    }

    if (isCurrent) {
      await trx
        .updateTable("sr_players")
        .set({ skin_identifier: null, skin_type: null, skin_variant: null })
        .where("uuid", "=", uuid)
        .execute()
    }

    await sql`delete from skin_owners where skin_name = ${canonical}`.execute(trx)

    const references = await trx
      .selectFrom("sr_player_history")
      .select("skin_identifier")
      .where("skin_identifier", "=", canonical)
      .execute()

    if (references.length === 0) {
      await trx.deleteFrom("sr_custom_skins").where("name", "=", canonical).execute()

      if (row.signature) {
        await sql`
          delete from sr_url_skins
          where signature = ${row.signature}
            and not exists (
              select 1 from sr_custom_skins
              where sr_custom_skins.signature = sr_url_skins.signature
            )
        `.execute(trx)
      }
    }

    await recordSkinAudit(trx, {
      actorUuid,
      targetUuid: uuid,
      action: "delete",
      skinName: canonical,
    })

    return true
  }

  const skin = {
    /**
     * Fails fast when the database predates the aether migrations.
     */
    async checkSchema(): Promise<void> {
      let version = 0

      try {
        const result = await sql<{ version: number | null }>`
          select max(version) as version from skin_schema_version
        `.execute(skinsDb)

        version = Number(result.rows[0]?.version ?? 0)
      } catch (e) {
        throw new Error(
          "Skins schema is missing: apply 0001_skins_ownership.sql and 0002_skins_indexes.sql",
          { cause: e },
        )
      }

      if (version < SKINS_SCHEMA_VERSION) {
        throw new Error(
          `Skins schema is outdated: found ${version}, need ${SKINS_SCHEMA_VERSION}`,
        )
      }
    },
    /**
     * Returns the cached skin payload for a given nickname
     */
    async getCachedSkinsPayload(nickname: string): Promise<SkinsHistory | null> {
      return (await readCachedEntry(nickname))?.data ?? null
    },
    /**
     * Paginated history. The cursor is an offset; the panel requests the first
     * page by default and the list is ordered current-first.
     */
    async getSkinsPage(
      nickname: string,
      query: { cursor?: string | null, limit?: number | string | null },
      minio: () => MinioClient,
    ): Promise<{ data: SkinsHistory, nextCursor: string | null }> {
      const data = await this.getSkinsPayload(nickname, minio) ?? []

      return paginateSkins(data, query.cursor, query.limit)
    },
    /**
     * Returns the history and warms the cache on a miss. A stale entry is
     * returned immediately and refreshed in the background.
     */
    async getSkinsPayload(
      nickname: string,
      minio: () => MinioClient,
    ): Promise<SkinsHistory | null> {
      const entry = await readCachedEntry(nickname)

      if (entry && Date.now() - entry.updatedAt < CACHE_REFRESH_MS) return entry.data;

      if (entry) {
        void this._warm(nickname, minio).catch((e) => {
          logger.warn({ message: "Skins background refresh failed", nickname, error: e })
        })
        return entry.data
      }

      return await this._warm(nickname, minio)
    },
    /**
     * Rebuilds the cache behind a single-flight lock. A caller that loses the
     * race reads the database directly instead of waiting on the winner.
     */
    async _warm(
      nickname: string,
      minio: () => MinioClient,
    ): Promise<SkinsHistory | null> {
      const lockKey = `${getSkinsHistoryCacheRedisKey(nickname)}:lock`
      let locked = false

      try {
        locked = (await redis().set(lockKey, "1", "PX", CACHE_LOCK_TTL_MS, "NX")) === "OK"
      } catch (e) {
        logger.warn({ message: "Skins cache lock failed", nickname, error: e })
      }

      if (!locked) {
        return (await readCachedEntry(nickname))?.data
          ?? await this._loadHistoryFromDB(nickname, minio)
      }

      const started = performance.now()

      try {
        let payload: SkinsHistory

        try {
          payload = await this._loadHistoryFromDB(nickname, minio)
        } catch (e) {
          logger.warn({ message: "Skins cache rebuild failed", nickname, error: e })
          payload = [fallbackSkin()]
        }

        if (payload.length === 0) payload = [fallbackSkin()]

        try {
          await writeCachedEntry(nickname, payload)
        } catch (e) {
          // The caller still gets the fresh payload when Redis is unavailable.
          logger.warn({ message: "Skins cache write failed", nickname, error: e })
        }

        logger.info({
          message: `skins.metric cache_rebuild_ms value=${Math.round(performance.now() - started)} nickname=${nickname}`,
        })

        return payload
      } finally {
        try {
          await redis().del(lockKey)
        } catch (e) {
          logger.warn({ message: "Skins cache lock release failed", nickname, error: e })
        }
      }
    },
    /**
     * Drops the cached history, e.g. before a rebuild after a skin change.
     */
    async invalidate(nickname: string): Promise<void> {
      try {
        await redis().del(getSkinsHistoryCacheRedisKey(nickname))
      } catch (e) {
        logger.warn({ message: "Skins cache invalidation failed", nickname, error: e })
      }
    },
    /**
     * Returns the skin URL for a given nickname
     */
    async getSkin(nickname: string): Promise<string> {
      const result = await readCachedEntry(nickname)
      return result?.data[0]?.skin_url ?? defaultSkinUrl;
    },
    /** Static skin used when the player has no row or the cache/storage failed. */
    getFallbackSkin(): SkinsHistorySingle {
      return fallbackSkin();
    },
    /**
     * Initializes a skin for a given nickname
     */
    async initSkin({
      nickname, minio, onFinish, onStart, onError, uuid
    }: {
      nickname: string,
      minio: () => MinioClient,
      onFinish?: () => void,
      onStart?: () => void,
      onError?: (e: unknown) => void,
      uuid?: string
    }): Promise<boolean> {
      let payload: SkinsHistory;

      try {
        onStart?.()
        payload = await this._loadHistoryFromDB(nickname, minio, uuid)
      } catch (e) {
        onError?.(e)
        payload = [fallbackSkin()]
      }

      // A player without a row or with a broken cache still gets a valid skin.
      if (payload.length === 0) payload = [fallbackSkin()]

      try {
        await writeCachedEntry(nickname, payload)
        onFinish?.()
      } catch (e) {
        // Redis is optional for correctness: the caller falls back to
        // `getFallbackSkin` when the cache cannot be written.
        onError?.(e)
      }

      return true
    },
    /**
     * Returns the default skin for a given nickname
     */
    async getDefaultSkin({
      skinsDb
    }: {
      skinsDb: SkinsParams["databases"]["skins"]
    }) {
      return await skinsDb
        .selectFrom("sr_custom_skins")
        .innerJoin("sr_url_skins", "sr_url_skins.value", "sr_custom_skins.value")
        .select([
          "sr_custom_skins.value",
          // The row is the server-wide fallback, not a player skin: a URL here
          // would become an invalid head identifier and avatar object key.
          sql<string>`'default'`.as("skin_identifier"),
          "sr_url_skins.skin_variant",
        ])
        .where("sr_custom_skins.name", "=", "default")
        // A skins DB without a "default" row is legal (fresh/dev installs); the
        // caller treats a missing row as "this player has no skin".
        .executeTakeFirst()
    },
    async _getSkinsHistory(uuid: string): Promise<Omit<PlayerSkinPayload, "value">[]> {
      return await skinsDb
        .selectFrom("sr_player_history")
        .select([
          "sr_player_history.skin_identifier",
          "sr_player_history.skin_variant",
          "sr_player_history.timestamp"
        ])
        .where("sr_player_history.uuid", "=", uuid)
        .orderBy("timestamp", "desc")
        .execute()
    },
    /**
     * SkinsRestorer writes the player row itself but lowercases the custom skin
     * name and leaves `skin_variant` empty. Put both back from the asset tables.
     */
    async _normalizeSelection({
      uuid, skinName,
    }: {
      uuid: string,
      skinName: string,
    }): Promise<void> {
      const canonical = await skinsDb
        .selectFrom("sr_custom_skins")
        .select(["name"])
        .where(sql`lower(sr_custom_skins.name)`, "=", skinName.toLowerCase())
        .executeTakeFirst()

      if (!canonical) return

      const variants = await skinsDb
        .selectFrom("sr_custom_skins")
        .innerJoin("sr_url_skins", "sr_url_skins.signature", "sr_custom_skins.signature")
        .select(["sr_url_skins.skin_variant"])
        .where("sr_custom_skins.name", "=", canonical.name)
        .execute()

      await skinsDb
        .updateTable("sr_players")
        .set({
          skin_identifier: canonical.name,
          skin_variant: pickSkinVariant(variants.map((entry) => entry.skin_variant)),
        })
        .where("uuid", "=", uuid)
        .execute()
    },
    /**
     * Admin moderation: removes one skin from the target player.
     */
    async rejectSkin(
      targetNickname: string,
      skinName: string,
      actorUuid: string,
      minio: () => MinioClient,
    ): Promise<number> {
      let uuid: string

      try {
        uuid = await playerService.getUuid(targetNickname)
      } catch {
        return 0
      }

      const removed = await skinsDb.transaction().execute(async (trx) => {
        const ok = await removePlayerSkin(trx, uuid, skinName, actorUuid)

        return ok ? 1 : 0
      })

      if (removed) {
        await this.invalidate(targetNickname)
        await this.initSkin({ nickname: targetNickname, uuid, minio })
      }

      return removed
    },
    /**
     * Admin moderation: removes every custom skin of the target player.
     */
    async rejectAllSkins(
      targetNickname: string,
      actorUuid: string,
      minio: () => MinioClient,
    ): Promise<number> {
      let uuid: string

      try {
        uuid = await playerService.getUuid(targetNickname)
      } catch {
        return 0
      }

      const [history, player] = await Promise.all([
        skinsDb
          .selectFrom("sr_player_history")
          .select("skin_identifier")
          .where("uuid", "=", uuid)
          .execute(),
        skinsDb
          .selectFrom("sr_players")
          .select("skin_identifier")
          .where("uuid", "=", uuid)
          .executeTakeFirst(),
      ])

      const ids = [...new Set([
        ...history.map((entry) => entry.skin_identifier),
        player?.skin_identifier ?? "",
      ].filter((id): id is string => Boolean(id) && isCustomSkin(id)))]

      const removed = await skinsDb.transaction().execute(async (trx) => {
        let count = 0

        for (const id of ids) {
          if (await removePlayerSkin(trx, uuid, id, actorUuid)) count++
        }

        return count
      })

      if (removed) {
        await this.invalidate(targetNickname)
        await this.initSkin({ nickname: targetNickname, uuid, minio })
      }

      return removed
    },
    /**
     * Sets a skin for a given nickname
     */
    async setSkin(
      nickname: string,
      identifier: string,
      minio: () => MinioClient,
    ): Promise<{
      ok: true
    } | {
      ok: false,
      error: "SKIN_NOT_FOUND" | "PLAYER_NOT_FOUND" | "SKIN_FORBIDDEN" | "SERVER_OFFLINE"
    }> {
      let uuid: string

      try {
        uuid = await playerService.getUuid(nickname);
      } catch {
        return { ok: false, error: "PLAYER_NOT_FOUND" }
      }

      const owner = await getSkinOwner(skinsDb, identifier)

      if (!canUseSkin({ skinName: identifier, nickname, uuid, owner })) {
        return { ok: false, error: "SKIN_FORBIDDEN" }
      }

      // Single-writer mode: the plugin stores the selection and refreshes the
      // live player, then the cache is rebuilt from the row it wrote.
      if (applySelection) {
        try {
          await applySelection({ nickname, uuid, skinName: identifier })
        } catch (e) {
          const code = e instanceof Error ? e.message : ""

          logger.warn({
            message: "Skin apply command failed",
            nickname,
            skinName: identifier,
            error: e,
          })

          return {
            ok: false,
            error: code === "SKIN_NOT_FOUND" ? "SKIN_NOT_FOUND" : "SERVER_OFFLINE",
          }
        }

        // SkinsRestorer stores the identifier lowercased and drops the variant;
        // restore the canonical name and variant so heads and slim models work.
        await this._normalizeSelection({ uuid, skinName: identifier })

        try {
          await recordSkinAudit(skinsDb, {
            actorUuid: uuid,
            targetUuid: null,
            action: "select",
            skinName: identifier,
          })
        } catch (e) {
          logger.warn({ message: "Skin audit write failed", nickname, skinName: identifier, error: e })
        }

        await this.invalidate(nickname)
        await this.initSkin({ nickname, uuid, minio })

        return { ok: true }      }

      const result = await skinsDb.transaction().execute(async (trx) => {
        const rows = await trx
          .selectFrom("sr_custom_skins")
          .leftJoin("sr_url_skins", "sr_url_skins.signature", "sr_custom_skins.signature")
          .select([
            "sr_custom_skins.name as name",
            "sr_url_skins.skin_variant as variant",
          ])
          .where("sr_custom_skins.name", "=", identifier)
          .orderBy(sql`sr_url_skins.skin_variant is null`, "asc")
          .orderBy("sr_url_skins.skin_variant", "asc")
          .execute()

        if (rows.length === 0) return { kind: "skin-not-found" as const }

        const current = await trx
          .selectFrom("sr_players")
          .select("skin_variant")
          .where("uuid", "=", uuid)
          .executeTakeFirst()

        // The plugin keeps the variant on the player row; preserve it instead of
        // resetting every custom skin to CLASSIC.
        const variant = pickSkinVariant(rows.map((row) => row.variant), current?.skin_variant)

        const updated = await trx
          .updateTable("sr_players")
          .set({
            skin_identifier: identifier,
            skin_variant: variant,
            skin_type: "CUSTOM",
          })
          .where("uuid", "=", uuid)
          .executeTakeFirst()

        if (!updated.numUpdatedRows) return { kind: "player-not-found" as const }

        await recordSkinAudit(trx, {
          actorUuid: uuid,
          targetUuid: null,
          action: "select",
          skinName: identifier,
        })

        return { kind: "ok" as const }
      })

      if (result.kind === "skin-not-found") return { ok: false, error: "SKIN_NOT_FOUND" }
      if (result.kind === "player-not-found") return { ok: false, error: "PLAYER_NOT_FOUND" }

      // Drop the old entry first: if the rebuild fails, readers fall back to the
      // database instead of serving the previous skin.
      await this.invalidate(nickname)
      await this.initSkin({ nickname, uuid, minio })

      return { ok: true }
    },
    /**
     * Updates skins for a given list of nicknames
     */
    async updateSkins({
      concurrency = 50,
      batchSize = 1000,
      minio,
      nicknames,
      onSuccess, onStart, onError, onSuccessPlayer, onErrorPlayer, nats
    }: {
      concurrency?: number,
      batchSize?: number,
      minio: () => MinioClient,
      nats: () => NatsConnection,
      onSuccess?: (processedCount: number) => void,
      onStart?: () => void,
      onError?: (e: unknown) => void,
      onSuccessPlayer?: (nickname: string) => void,
      onErrorPlayer?: (nickname: string, err: unknown) => void,
      nicknames?: string[]
    }) {
      const limit = pLimit(concurrency);
      let processedCount = 0;

      const start = performance.now();
      onStart?.()

      try {
        if (nicknames && nicknames.length > 0) {
          await Promise.all(
            nicknames.map((nickname) => limit(async () => {
              try {
                await this.initSkin({ nickname, minio });
                processedCount++;
                onSuccessPlayer?.(nickname);
              } catch (e) {
                onErrorPlayer?.(nickname, e);
              }
            }))
          );
        } else {
          let lastNickname = "";

          while (true) {
            const query = await generalDb
              .selectFrom("accounts")
              .select("nickname")
              .where("nickname", ">", lastNickname)
              .orderBy("nickname")
              .limit(batchSize)
              .execute();

            const targets = query.map((p) => p.nickname)
            if (targets.length === 0) break;

            await Promise.all(
              targets.map((nickname) => limit(async () => {
                try {
                  await this.initSkin({ nickname, minio });
                  processedCount++;
                  onSuccessPlayer?.(nickname)
                } catch (e) {
                  onErrorPlayer?.(nickname, e);
                }
              }))
            );

            lastNickname = targets[targets.length - 1];
          }
        }

        const end = performance.now();

        const payload = {
          data: `Finished for ${(end - start).toFixed(2)}ms. Updated ${processedCount} users.`
        }

        onSuccess?.(processedCount)
        nats().publish(SUBJECTS.EVENTS.SKINS.UPDATE, JSON.stringify(payload))
      } catch (e) {
        onError?.(e)
        throw e
      }
    },
    async _loadHistoryFromDB(
      nickname: string,
      minio: () => MinioClient,
      uuidOpt?: string
    ): Promise<SkinsHistory> {
      const uuid = uuidOpt ?? await playerService.getUuid(nickname);

      const resolveCurrentSkin = async (
        uuid: string,
        history: Omit<PlayerSkinPayload, "value">[],
      ): Promise<PlayerSkinPayload | null> => {
        const row = await skinsDb
          .selectFrom("sr_players")
          .select(["skin_identifier", "skin_variant"])
          .where("sr_players.uuid", "=", uuid)
          .executeTakeFirst()

        const id = row?.skin_identifier

        /** The plugin appends history rows; aether selections may not have one. */
        const timestampFor = (skinIdentifier: string, fallback = 0) =>
          history.find((entry) => entry.skin_identifier === skinIdentifier)?.timestamp ?? fallback

        if (!id) {
          const defaultSkin = await this.getDefaultSkin({ skinsDb });

          return defaultSkin ? { ...defaultSkin, timestamp: 0 } : null;
        }

        if (isCustomSkin(id)) {
          const skin = await skinsDb
            .selectFrom("sr_custom_skins")
            .leftJoin("sr_url_skins", "sr_url_skins.signature", "sr_custom_skins.signature")
            .select([
              "sr_custom_skins.value",
              "sr_url_skins.skin_variant",
            ])
            .where("sr_custom_skins.name", "=", id)
            .orderBy(sql`sr_url_skins.skin_variant is null`, "asc")
            .orderBy("sr_url_skins.skin_variant", "asc")
            .execute()

          if (skin.length > 0) {
            return {
              value: skin[0].value,
              skin_identifier: id,
              skin_variant: pickSkinVariant(
                skin.map((entry) => entry.skin_variant),
                row?.skin_variant,
              ),
              timestamp: timestampFor(id),
            }
          }
        }

        const resolved = await skinsDb
          .selectFrom("sr_players")
          .innerJoin("sr_player_skins", "sr_player_skins.uuid", "sr_players.skin_identifier")
          .select([
            "sr_player_skins.uuid as skin_identifier",
            "sr_player_skins.value",
            "sr_players.skin_variant",
            "sr_player_skins.timestamp"
          ])
          .where("sr_players.uuid", "=", uuid)
          .executeTakeFirst()

        if (resolved) {
          return {
            ...resolved,
            timestamp: timestampFor(resolved.skin_identifier, resolved.timestamp),
          }
        }

        const defaultSkin = await this.getDefaultSkin({ skinsDb });

        return defaultSkin ? { ...defaultSkin, timestamp: 0 } : null;
      }

      // History carries the real timestamps; the current skin is resolved
      // against it so the panel does not get a synthetic value.
      const history = await this._getSkinsHistory(uuid)
      const current = await resolveCurrentSkin(uuid, history)

      if (!current) return []

      const prevIds = history
        .map(h => h.skin_identifier)
        .filter(id => id !== current.skin_identifier)

      const customIds: string[] = []
      const defaultIds: string[] = []

      for (const id of prevIds) {
        if (isCustomSkin(id)) {
          customIds.push(id)
        } else {
          defaultIds.push(id)
        }
      }

      const historyTimestamp = new Map(
        history.map((entry) => [entry.skin_identifier, entry.timestamp]),
      )

      const getCustomSkins = async (ids: string[]) => {
        if (ids.length === 0) return []

        const rows = await skinsDb
          .selectFrom("sr_custom_skins")
          .innerJoin("sr_url_skins", "sr_url_skins.signature", "sr_custom_skins.signature")
          .select([
            "sr_custom_skins.value",
            "sr_custom_skins.name as skin_identifier",
            "sr_url_skins.skin_variant",
          ])
          .where("sr_custom_skins.name", "in", ids)
          .orderBy(sql`sr_url_skins.skin_variant is null`, "asc")
          .orderBy("sr_url_skins.skin_variant", "asc")
          .execute()

        return rows.map((row) => ({
          ...row,
          timestamp: historyTimestamp.get(row.skin_identifier) ?? 0,
        }))
      }

      const getDefaultSkins = async (ids: string[]) => {
        if (ids.length === 0) return []

        return await skinsDb
          .selectFrom("sr_player_skins")
          .select([
            "value",
            "timestamp",
            "uuid as skin_identifier",
            sql<string>`'CLASSIC'`.as('skin_variant')
          ])
          .where("uuid", "in", ids)
          .execute()
      }

      const [customSkins, defaultSkins] = await Promise.all([
        getCustomSkins(customIds),
        getDefaultSkins(defaultIds)
      ])

      const skinsData = [...customSkins, ...defaultSkins]

      // Current stays first; the rest is newest-first by the real timestamp.
      const previousSkins = prevIds.length === 0
        ? []
        : skinsData.sort((a, b) => b.timestamp - a.timestamp)
      const unique = new Map<string, PlayerSkinPayload & { skin: Skin, headKey: string }>()

      for (const entry of [current, ...previousSkins]) {
        // A signature join can repeat one skin; keep the first (current) entry.
        if (unique.has(entry.skin_identifier)) continue;

        const parsed = safeJsonParse<Skin>(atob(entry.value))

        if (!parsed.ok) {
          logger.warn({
            message: "Skins history entry skipped: invalid texture",
            uuid,
            skinIdentifier: entry.skin_identifier,
            error: parsed.error.message,
          })
          continue;
        }

        unique.set(entry.skin_identifier, {
          ...entry,
          skin: parsed.value,
          headKey: skinHeadKey(entry.value),
        })
      }

      const data: SkinsHistory = Array.from(unique.values()).map(v => {
        const skin_head_url = isCustomSkin(v.skin_identifier)
          ? getHeadUrl(v.headKey)
          : v.skin_identifier === "default"
            ? defaultHead
            : getDefaultSkinHeadUrl(v.skin_identifier);

        return {
          skin_identifier: v.skin_identifier,
          timestamp: v.timestamp,
          skin_variant: v.skin_variant ?? DEFAULT_SKIN_VARIANT,
          skin_url: v.skin.textures.SKIN.url,
          skin_head_url
        }
      })

      const headEntries = Array.from(unique.values())
        .filter((v) => isCustomSkin(v.skin_identifier))
        .map((v) => ({ hash: v.headKey, skinUrl: v.skin.textures.SKIN.url }))

      try {
        await this._performHead({ entries: headEntries, minio })
      } catch (e) {
        // History is still valid when head rendering fails; the next rebuild
        // retries the missing objects.
        logger.warn({ message: "Skins head render failed", nickname, error: e })
      }

      return data
    },
    /**
     * Returns the head of a skin from a given URL. The host is allowlisted and
     * the fetch is bounded: an untrusted texture URL must not hang a rebuild.
     */
    async _getHeadFromSkin(url: string, size = 128) {
      if (!isAllowedSkinHost(url)) {
        throw new Error(`Skin host is not allowed: ${url}`)
      }

      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })

      if (!response.ok) {
        throw new Error(`Skin fetch failed: ${response.status}`)
      }

      const skin = await loadImage(Buffer.from(await response.arrayBuffer()));

      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(skin, 8, 8, 8, 8, 0, 0, size, size);
      ctx.drawImage(skin, 40, 8, 8, 8, 0, 0, size, size);

      return canvas.toBuffer('image/png');
    },
    /**
     * Renders only missing heads. Keys are content-addressed, so a repeated
     * warm-up is a stat call per skin, not a full re-render.
     */
    async _performHead({
      entries, minio
    }: {
      entries: { hash: string, skinUrl: string }[],
      minio: () => MinioClient,
    }): Promise<void> {
      if (!entries.length) return;

      const client = minio()
      const uniqueEntries = [...new Map(entries.map((entry) => [entry.hash, entry])).values()]

      await Promise.all(
        uniqueEntries.map(async ({ hash, skinUrl }) => {
          const key = `heads-${hash}.png`

          try {
            await client.statObject(BUCKETS.AVATARS, key)
            logger.debug({ message: `skins.metric head_cache_hit key=${key}` })
            return
          } catch {
            // Missing: queue it, then try the inline render.
          }

          await enqueueHeadJob(skinsDb, hash, skinUrl)

          const started = performance.now()

          try {
            const target = await this._getHeadFromSkin(skinUrl)
            await client.putObject(BUCKETS.AVATARS, key, target)
            await finishHeadJob(skinsDb, hash)
            logger.info({
              message: `skins.metric head_render_ms value=${Math.round(performance.now() - started)} key=${key}`,
            })
          } catch (e) {
            // The job stays pending for the cron retry.
            logger.warn({ message: `skins.metric head_render_failed key=${key}`, error: e })
          }
        })
      )
    },
    /**
     * Retries queued head renders. Failures stay pending until five attempts,
     * then move to `failed` for inspection.
     */
    async processHeadJobs(
      minio: () => MinioClient,
      limit = 20,
    ): Promise<number> {
      const jobs = await sql<HeadJob>`
        select hash, skin_url, attempts
        from skin_head_jobs
        where status = 'pending' and attempts < 5
        order by updated_at
        limit ${limit}
      `.execute(skinsDb)

      if (jobs.rows.length === 0) return 0

      const client = minio()
      let done = 0

      for (const job of jobs.rows) {
        try {
          const target = await this._getHeadFromSkin(job.skin_url)
          await client.putObject(BUCKETS.AVATARS, `heads-${job.hash}.png`, target)
          await finishHeadJob(skinsDb, job.hash)
          done++
        } catch (e) {
          const attempts = job.attempts + 1
          const status = attempts >= 5 ? "failed" : "pending"
          const message = e instanceof Error ? e.message : String(e)

          await sql`
            update skin_head_jobs
            set attempts = ${attempts}, status = ${status}, last_error = ${message}, updated_at = ${Math.floor(Date.now() / 1000)}
            where hash = ${job.hash}
          `.execute(skinsDb)
        }
      }

      return done
    }
  }

  return {
    player,
    players,
    skin,
  }
}
