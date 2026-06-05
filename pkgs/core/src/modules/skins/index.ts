import pLimit from "p-limit";
import { sql } from "kysely";
import { type Static, t } from "elysia";
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getStaticUrl } from "../../utils/url";
import { safeJsonParse } from "@repo/shared/lib/utils";
import { buildRedisKey } from "../../utils/redis";
import { createPlayer } from "../player";
import { SUBJECTS } from "@repo/shared/constants/subjects"
import { BUCKETS } from "@repo/shared/constants/buckets";
import type RedisClient from "ioredis";
import type { Kysely } from "kysely";
import type { DB as generalDb } from "@repo/shared/types/db/general";
import type { DB as skinsDb } from "@repo/shared/types/db/skins"
import type { Client as MinioClient } from "minio"
import type { NatsConnection } from "@nats-io/nats-core"

export const getSkinsHistoryCacheRedisKey = (nickname: string) => buildRedisKey({
  name: `players:skins:${nickname}`,
  target: "internal",
});

export const getSkinName = (key: string) => `skin-${key}.png`
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

type SkinsParams = {
  databases: {
    general: Kysely<generalDb>,
    skins: Kysely<skinsDb>
  }
  redis: () => RedisClient,
  nats: () => NatsConnection,
  config: {
    VOLUME_URL: string
  }
}

export const createSkins = ({
  redis, databases, nats, config
}: SkinsParams) => {
  const { general: generalDb, skins: skinsDb } = databases;

  const getCustomHead = (
    nickname: string, identifier: string
  ) => `${config.VOLUME_URL}/${BUCKETS.AVATARS}/${getAvatarName(nickname, identifier)}`

  async function getCachedSkinsPayload(nickname: string): Promise<SkinsHistory | null> {
    const str = await redis().get(getSkinsHistoryCacheRedisKey(nickname))
    if (!str) return null;
    const result = safeJsonParse<SkinsHistory>(str)
    if (!result.ok) return null;
    return result.value
  };

  const player = createPlayer({
    generalDb, redis
  })

  return {
    player: {
      async getAvatar(nickname: string): Promise<string> {
        const result = await getCachedSkinsPayload(nickname)
        if (!result) return DEFAULT_HEAD(config.VOLUME_URL)
        return result[0]?.skin_head_url ?? DEFAULT_HEAD(config.VOLUME_URL)
      }
    },
    players: {
      async getCachedSkinPayloads(nicknames: string[]): Promise<Record<string, SkinsHistory | null>> {
        const keys = nicknames.map(getSkinsHistoryCacheRedisKey);
        if (keys.length === 0) return {};

        const resultsStr = await redis().mget(...keys);
        const map: Record<string, SkinsHistory | null> = Object.create(null)

        for (let i = 0; i < resultsStr.length; i++) {
          const val = resultsStr[i];
          const nickname = nicknames[i];

          if (!val) {
            map[nickname] = null;
            continue;
          }

          const parsed = safeJsonParse<SkinsHistory>(val);
          map[nickname] = parsed.ok ? parsed.value : null;
        }

        return map;
      },
      async getAvatar(nicknames: string[]): Promise<Record<string, string>> {
        const result = await this.getCachedSkinPayloads(nicknames)
        const map: Record<string, string> = Object.create(null)

        for (let i = 0; i < nicknames.length; i++) {
          const name = nicknames[i];
          const skinData = result[name];

          if (skinData && skinData.length > 0) {
            map[name] = skinData[0].skin_head_url ?? DEFAULT_HEAD(config.VOLUME_URL);
          } else {
            map[name] = DEFAULT_HEAD(config.VOLUME_URL);
          }
        }

        return map
      }
    },
    skin: {
      getCachedSkinsPayload,
      async getSkin(nickname: string): Promise<string> {
        const result = await this.getCachedSkinsPayload(nickname)
        if (!result) return DEFAULT_HEAD(config.VOLUME_URL)
        return result[0]?.skin_url ?? DEFAULT_HEAD(config.VOLUME_URL)
      },
      async initSkin({
        nickname, minio, onFinish, onStart, onError,
      }: {
        nickname: string,
        minio: () => MinioClient,
        onFinish?: () => void,
        onStart?: () => void,
        onError?: (e: unknown) => void,
      }): Promise<boolean> {
        try {
          onStart?.()

          const payload = await this._loadHistoryFromDB(nickname, minio)

          await redis().set(
            getSkinsHistoryCacheRedisKey(nickname), JSON.stringify(payload)
          )

          onFinish?.()
          return true
        } catch (e) {
          onError?.(e)
          return false
        }
      },
      async getDefaultSkin(skinsDb: SkinsParams["databases"]["skins"]) {
        return await skinsDb
          .selectFrom("sr_custom_skins")
          .innerJoin("sr_url_skins", "sr_url_skins.value", "sr_custom_skins.value")
          .select([
            "sr_custom_skins.value",
            "sr_url_skins.url as skin_identifier",
            "sr_url_skins.skin_variant",
          ])
          .where("sr_custom_skins.name", "=", "default")
          .executeTakeFirstOrThrow()
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
      async setSkin(
        nickname: string, identifier: string, minio: () => MinioClient,
      ) {
        const uuid = await player.getUUID(nickname);

        const result = await skinsDb.transaction().execute(async (trx) => {
          const query = await trx
            .selectFrom("sr_custom_skins")
            .select("name as skin_identifier")
            .where("name", "=", identifier)
            .executeTakeFirst()

          if (!query) throw new Error("Selected skin not found")

          const skinResult = await trx
            .updateTable("sr_players")
            .set({
              skin_identifier: query.skin_identifier,
              skin_type: "CUSTOM",
            })
            .where("uuid", "=", uuid)
            .executeTakeFirst()

          return skinResult
        })

        if (!result.numUpdatedRows) return false;

        return await this.initSkin({ nickname, minio })
      },
      async updateSkins({
        concurrency = 50,
        batchSize = 1000,
        minio,
        nicknames,
        onSuccess, onStart, onError, onSuccessPlayer, onErrorPlayer
      }: {
        concurrency?: number,
        batchSize?: number,
        minio: () => MinioClient
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
                .selectFrom("AUTH")
                .select("NICKNAME as nickname")
                .where("NICKNAME", ">", lastNickname)
                .orderBy("NICKNAME")
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
        nickname: string, minio: () => MinioClient
      ): Promise<SkinsHistory> {
        const uuid = await player.getUUID(nickname);
        const scope = this;

        async function resolveCurrentSkin(uuid: string): Promise<PlayerSkinPayload> {
          const row = await skinsDb
            .selectFrom("sr_players")
            .select("skin_identifier")
            .where("sr_players.uuid", "=", uuid)
            .executeTakeFirst()

          const id = row?.skin_identifier

          if (!id) {
            return {
              ...await scope.getDefaultSkin(skinsDb),
              timestamp: 10000000
            }
          }

          if (isCustomSkin(id)) {
            const skin = await skinsDb
              .selectFrom("sr_custom_skins")
              .select(["value"])
              .where("name", "=", id)
              .executeTakeFirst()

            if (skin) {
              return {
                value: skin.value,
                skin_identifier: id,
                skin_variant: DEFAULT_SKIN_VARIANT,
                timestamp: 10000000
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

          if (resolved) return resolved

          return {
            ...await scope.getDefaultSkin(skinsDb),
            timestamp: 10000000
          }
        }

        const [current, history] = await Promise.all([
          resolveCurrentSkin(uuid), scope._getSkinsHistory(uuid)
        ])

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

        async function getCustomSkins(ids: string[]) {
          if (ids.length === 0) return []

          return await skinsDb
            .selectFrom("sr_custom_skins")
            .innerJoin("sr_url_skins", "sr_url_skins.signature", "sr_custom_skins.signature")
            .select([
              "sr_custom_skins.value",
              "sr_custom_skins.name as skin_identifier",
              "sr_url_skins.skin_variant",
              sql<number>`${10000000}`.as('timestamp')
            ])
            .where("sr_custom_skins.name", "in", ids)
            .execute()
        }

        async function getDefaultSkins(ids: string[]) {
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

        const getSkinsData = [
          ...(await getCustomSkins(customIds)),
          ...(await getDefaultSkins(defaultIds))
        ]

        const previousSkins = prevIds.length === 0 ? [] : getSkinsData
        const unique = new Map<string, PlayerSkinPayload & { skin: Skin }>()

        for (const entry of [current, ...previousSkins]) {
          const parsed = safeJsonParse<Skin>(atob(entry.value))

          if (!parsed.ok) {
            console.warn(`For ${uuid} skin don't updated`, parsed.error.message)
            continue;
          }

          unique.set(entry.skin_identifier, {
            ...entry,
            skin: parsed.value
          })
        }

        const result: SkinsHistory = Array.from(unique.values()).map(v => ({
          skin_identifier: v.skin_identifier,
          timestamp: v.timestamp,
          skin_variant: v.skin_variant ?? DEFAULT_SKIN_VARIANT,
          skin_url: v.skin.textures.SKIN.url,
          skin_head_url: isCustomSkin(v.skin_identifier)
            ? getCustomHead(nickname, v.skin_identifier)
            : getDefaultSkinHeadUrl(v.skin_identifier)
        }))

        this._performHead(result, nickname, minio)

        return result
      },
      async _getHeadFromSkin(url: string, size = 128) {
        const skin = await loadImage(url);

        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(skin, 8, 8, 8, 8, 0, 0, size, size);
        ctx.drawImage(skin, 40, 8, 8, 8, 0, 0, size, size);

        return canvas.toBuffer('image/png');
      },
      async _performHead(
        data: SkinsHistorySingle[],
        nickname: string,
        minio: () => MinioClient,
      ) {
        const state: SkinsHistory = data
          .map(d => isCustomSkin(d.skin_identifier) ? d : null)
          .filter(d => d !== null)

        if (!state.length) return;

        const performResult = await Promise.all(
          state.map(async (c) => {
            const target = c.skin_url
              ? await this._getHeadFromSkin(c.skin_url)
              : DEFAULT_HEAD(config.VOLUME_URL)

            return minio().putObject(BUCKETS.AVATARS, getAvatarName(nickname, c.skin_identifier), target);
          })
        )

        return performResult;
      }
    },
  }
}
