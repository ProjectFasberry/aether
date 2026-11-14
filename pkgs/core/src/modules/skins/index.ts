import pLimit from "p-limit";
import { sql } from "kysely";
import { type Static, t } from "elysia";
import { createCanvas, loadImage } from '@napi-rs/canvas';
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
const CACHE_VERSION = "v3";
/** Hard TTL: an entry older than this is rebuilt on the next read. */
const CACHE_TTL_SECONDS = 24 * 60 * 60;
/** Soft TTL: a read after this age refreshes the entry in the background. */
const CACHE_REFRESH_MS = 60 * 60 * 1000;
/** Guards a single rebuild per nickname across processes. */
const CACHE_LOCK_TTL_MS = 10_000;
/** Highest applied file in `pkgs/config-drizzle/drizzle/skins/`. */
const SKINS_SCHEMA_VERSION = 2;

export const getSkinsHistoryCacheRedisKey = (nickname: string) => buildRedisKey({
  name: `players:skins:${CACHE_VERSION}:${nickname.toLowerCase()}`,
  target: "internal",
});

export const getAvatarName = (nickname: string, identifier: string) => `${nickname}-${identifier}.png`

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

export const createSkinsService = ({ redis, databases, config, applySelection }: SkinsParams) => {
  const { general: generalDb, skins: skinsDb } = databases;

  const getCustomHead = (
    nickname: string, identifier: string
  ) => `${config.API_URL.replace(/\/$/, "")}/${BUCKETS.AVATARS}/${getAvatarName(nickname, identifier)}`

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
      const unique = new Map<string, PlayerSkinPayload & { skin: Skin }>()

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
          skin: parsed.value
        })
      }

      const data: SkinsHistory = Array.from(unique.values()).map(v => {
        const skin_head_url = isCustomSkin(v.skin_identifier)
          ? getCustomHead(nickname, v.skin_identifier)
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

      try {
        await this._performHead({ data, nickname, minio })
      } catch (e) {
        // History is still valid when head rendering fails; the next rebuild
        // retries the missing objects.
        logger.warn({ message: "Skins head render failed", nickname, error: e })
      }

      return data
    },
    /**
     * Returns the head of a skin from a given URL
     */
    async _getHeadFromSkin(url: string, size = 128) {
      const skin = await loadImage(url);

      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(skin, 8, 8, 8, 8, 0, 0, size, size);
      ctx.drawImage(skin, 40, 8, 8, 8, 0, 0, size, size);

      return canvas.toBuffer('image/png');
    },
    /**
     * Performs the head for a given nickname and skin data
     */
    async _performHead({
      data, nickname, minio
    }: {
      data: SkinsHistorySingle[],
      nickname: string,
      minio: () => MinioClient,
    }): Promise<void> {
      const history: SkinsHistory = data
        .map(d => isCustomSkin(d.skin_identifier) ? d : null)
        .filter(d => d !== null)

      if (!history.length) return;

      await Promise.all(
        history.map(async (c) => {
          const target = c.skin_url
            ? await this._getHeadFromSkin(c.skin_url)
            : defaultHead

          await minio().putObject(BUCKETS.AVATARS, getAvatarName(nickname, c.skin_identifier), target);
        })
      )
    }
  }

  return {
    player,
    players,
    skin,
  }
}
