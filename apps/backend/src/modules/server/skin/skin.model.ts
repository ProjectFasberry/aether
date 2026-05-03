import { skins } from "#/shared/database/skins-db";
import { getAvatarName, getStaticUrl } from "#/helpers/volume";
import { getPlayerUUID } from "#/utils/player/uuid";
import { getRedis } from "#/shared/redis/client";
import { safeJsonParse } from "#/utils/config/transforms";
import pLimit from "p-limit";
import { general } from "#/shared/database/general-db";
import { sql } from "kysely";
import { BUCKETS, minio } from "#/shared/minio/client";
import { isProduction, MINESKIN_AES_SECRET_KEY, MINESKIN_API_KEY, VOLUME_URL } from "#/shared/env";
import { logger } from "#/utils/config/logger";
import * as z from "zod/v4";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";
import type { Transaction } from "kysely";
import type { DB } from "@repo/shared/types/db/skins-database-types";
import { client as inheritClient } from "#/shared/api/client";
import { wrapError } from "#/helpers/wrap-error";
import type { KyInstance } from "ky";
import { type Static, t, type Context } from "elysia";
import { nanoid } from "nanoid";
import { getRedisKey } from "#/helpers/redis";
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getNats } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";

export type Skin = {
  textures: {
    SKIN: {
      url: string,
      metadata: {
        model: string
      }
    }
  },
  profileName: string,
  profileId: string
}

const DEFAULT_SKIN_VARIANT = "CLASSIC"
export const DEFAULT_HEAD = "fallback/steve_head.png"
const DEFAULT_SKIN = "fallback/steve_skin.png"

async function getCachedSkinPayload(nickname: string): Promise<SkinsHistoryPayload | null> {
  const redis = getRedis()

  const resultStr = await redis.get(getSkinsHistoryCacheRedisKey(nickname))
  if (!resultStr) return null;

  const result = safeJsonParse<SkinsHistoryPayload>(resultStr)

  if (!result.ok) {
    console.error(result.error.message)
    return null;
  }

  return result.value
}

export async function getSkin(nickname: string): Promise<string> {
  const result = await getCachedSkinPayload(nickname)
  if (!result) return getStaticUrl(DEFAULT_HEAD)
  return result[0].skin_url ?? getStaticUrl(DEFAULT_HEAD)
}

export async function getPlayerAvatar(nickname: string): Promise<string> {
  const result = await getCachedSkinPayload(nickname)
  if (!result) return getStaticUrl(DEFAULT_HEAD)
  return result[0].skin_head_url ?? getStaticUrl(DEFAULT_HEAD)
}

export const getSkinsHistoryCacheRedisKey = (nickname: string) => getRedisKey("internal", `players:skins:${nickname}`) 

export type SkinsHistoryPayload = Static<typeof skinsHistorySchema>

export const skinHistorySingleSchema = t.Object({
  skin_identifier: t.String(),
  skin_variant: t.Nullable(t.String()),
  timestamp: t.Number(),
  skin_url: t.Nullable(t.String()),
  skin_head_url: t.Nullable(t.String())
})

export const skinsHistorySchema = t.Array(
  skinHistorySingleSchema
)
type SkinsHistory = Static<typeof skinHistorySingleSchema>
export async function getSkinsHistory({ nickname }: { nickname: string }) {
  const result = await getCachedSkinPayload(nickname)
  return result
}

const getDefaultSkinHead = (identifier: string) => `https://mc-heads.net/avatar/${identifier}`
const getCustomHead = (nickname: string, identifier: string) => `${VOLUME_URL}/${BUCKETS.AVATARS}/${getAvatarName(nickname, identifier)}`

function isCustomSkin(identifier: string) {
  return identifier.startsWith("sr")
}

type PlayerSkinPayload = Pick<SkinsHistory, "skin_identifier" | "skin_variant" | "timestamp"> & { value: string }

async function getDefaultSkin() {
  return await skins
    .selectFrom("sr_custom_skins")
    .innerJoin("sr_url_skins", "sr_url_skins.value", "sr_custom_skins.value")
    .select([
      "sr_custom_skins.value",
      "sr_url_skins.url as skin_identifier",
      "sr_url_skins.skin_variant",
    ])
    .where("sr_custom_skins.name", "=", "default")
    .executeTakeFirstOrThrow()
}

export async function getHeadFromSkin(url: string, size = 128) {
  const skin = await loadImage(url);

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(skin, 8, 8, 8, 8, 0, 0, size, size);  
  ctx.drawImage(skin, 40, 8, 8, 8, 0, 0, size, size); 

  return canvas.toBuffer('image/png');
}

async function performHead(data: SkinsHistory[], nickname: string) {
  const state: SkinsHistory[] = data
    .map(d => isCustomSkin(d.skin_identifier) ? d : null)
    .filter(d => d !== null)

  if (!state.length) return;

  const client = minio.get()

  const performResult = await Promise.all(
    state.map(async (c) => {
      const target = c.skin_url
        ? await getHeadFromSkin(c.skin_url)
        : getStaticUrl(DEFAULT_HEAD)

      return client.putObject(BUCKETS.AVATARS, getAvatarName(nickname, c.skin_identifier), target);
    })
  )

  console.log(performResult);
  return performResult;
}

async function getDefaultSkins(ids: string[]) {
  if (!ids.length) return []

  return await skins
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

async function getCustomSkins(ids: string[]) {
  if (!ids.length) return []

  return await skins
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

async function getPlayerSkinsHistory(uuid: string): Promise<Omit<PlayerSkinPayload, "value">[]> {
  return await skins
    .selectFrom("sr_player_history")
    .select([
      "sr_player_history.skin_identifier",
      "sr_player_history.skin_variant",
      "sr_player_history.timestamp"
    ])
    .where("sr_player_history.uuid", "=", uuid)
    .orderBy("timestamp", "desc")
    .execute()
}

async function loadSkinsHistoryFromDB(nickname: string): Promise<SkinsHistoryPayload> {
  const uuid = await getPlayerUUID(nickname);

  async function resolveCurrentSkin(uuid: string): Promise<PlayerSkinPayload> {
    const row = await skins
      .selectFrom("sr_players")
      .select("skin_identifier")
      .where("sr_players.uuid", "=", uuid)
      .executeTakeFirst()

    const id = row?.skin_identifier

    if (!id) {
      const d = await getDefaultSkin()
      return { ...d, timestamp: 10000000 }
    }

    if (isCustomSkin(id)) {
      const skin = await skins
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

    const resolved = await skins
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

    const d = await getDefaultSkin()
    return { ...d, timestamp: 10000000 }
  }

  const [current, history] = await Promise.all([
    resolveCurrentSkin(uuid), getPlayerSkinsHistory(uuid)
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

  const previousSkins =
    prevIds.length === 0
      ? []
      : [
        ...(await getCustomSkins(customIds)),
        ...(await getDefaultSkins(defaultIds))
      ]

  const unique = new Map<string, PlayerSkinPayload & { skin: Skin }>()

  for (const entry of [current, ...previousSkins]) {
    const parsed = safeJsonParse<Skin>(atob(entry.value))

    if (!parsed.ok) {
      console.warn(`For ${uuid} skin don't updated. Error for parsing`, parsed.error.message)
      continue;
    }

    unique.set(entry.skin_identifier, {
      ...entry,
      skin: parsed.value
    })
  }

  const result: SkinsHistoryPayload = Array.from(unique.values()).map(v => ({
    skin_identifier: v.skin_identifier,
    timestamp: v.timestamp,
    skin_variant: v.skin_variant ?? DEFAULT_SKIN_VARIANT,
    skin_url: v.skin.textures.SKIN.url,
    skin_head_url: isCustomSkin(v.skin_identifier)
      ? getCustomHead(nickname, v.skin_identifier)
      : getDefaultSkinHead(v.skin_identifier)
  }))

  performHead(result, nickname)

  return result
}

const initLogger = logger.withTag("Init")

export async function initPlayerSkin(nickname: string): Promise<boolean> {
  const initSkinLogger = initLogger.withTag("Skin")
  initSkinLogger.log(`Start initing skin for ${nickname}`);

  try {
    const redis = getRedis()
    const payload = await loadSkinsHistoryFromDB(nickname)

    await redis.set(
      getSkinsHistoryCacheRedisKey(nickname), JSON.stringify(payload)
    )

    initSkinLogger.success(`Finish initing skin for ${nickname}`);
    return true
  } catch (e) {
    initSkinLogger.error(`Error initing skin for ${nickname}`, e);
    return false
  }
}

export async function setSkin(nickname: string, identifier: string) {
  const uuid = await getPlayerUUID(nickname);

  const result = await skins.transaction().execute(async (trx) => {
    const query = await skins
      .selectFrom("sr_custom_skins")
      .select("name as skin_identifier")
      .where("name", "=", identifier)
      .executeTakeFirst()

    if (!query) {
      throw new Error("Selected skin not found")
    }

    const a = await skins
      .updateTable("sr_players")
      .set({
        skin_identifier: query.skin_identifier,
        skin_type: "CUSTOM",
      })
      .where("uuid", "=", uuid)
      .executeTakeFirst()

    return a
  })

  if (!result.numUpdatedRows) {
    return false;
  }

  const up = await initPlayerSkin(nickname)
  return up
}

export async function updatePlayersSkins(concurrency = 50, batchSize = 1000) {
  const limit = pLimit(concurrency);
  const results = new Map<string, boolean>();
  let lastNickname = "";

  const start = performance.now();

  while (true) {
    const batch = await general
      .selectFrom("AUTH")
      .select("NICKNAME as nickname")
      .where("NICKNAME", ">", lastNickname)
      .orderBy("NICKNAME")
      .limit(batchSize)
      .execute();

    if (batch.length === 0) break;

    await Promise.all(
      batch.map(user =>
        limit(async () => {
          const ok = await initPlayerSkin(user.nickname);
          results.set(user.nickname, ok);
        })
      )
    );

    lastNickname = batch[batch.length - 1].nickname;

    console.log(`Processed ${results.size} users so far`);
  }

  const end = performance.now();

  const nc = getNats();
  nc.publish(SUBJECTS.EVENTS.SKINS.UPDATE, JSON.stringify({
    data: `Finished for ${(end - start).toFixed(2)}ms. Updated ${results.size} users.`
  }))

  return results;
}

//#region
const MINESKIN_BASE_URL = "https://api.mineskin.org/v2";
const MINESKIN_USER_AGENT = "Axolotl-MineSkin-Proxy/1.0";
const MINESKIN_URL_PREFIX = "https://minesk.in/";
const ENCRYPTED_URL_SCHEME = "skinsrestorer-axolotl://";
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1_000;
const CAPE_CACHE_TTL_MS = 5 * 60 * 1_000;

const uploadNameSchema = z.string().trim().min(1).max(64).optional();

const uploadFormSchema = z.object({
  variant: z.enum(["classic", "slim"]),
  name: uploadNameSchema,
  capeUuid: z.uuid(),
});

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class UpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

function sanitizeStatus(status: number): number {
  if (Number.isInteger(status) && status >= 100 && status <= 599) {
    return status;
  }
  return 502;
}

export function normalizeStatus(
  status: number,
  allowed: number[],
  fallback: number,
): number {
  const sanitized = sanitizeStatus(status);
  const safeFallback = sanitizeStatus(fallback);
  return allowed.map(sanitizeStatus).includes(sanitized)
    ? sanitized
    : safeFallback;
}

function isFileLike(value: unknown): value is Blob {
  if (!value || typeof value === "string") {
    return false;
  }
  return typeof (value as Blob).arrayBuffer === "function";
}

type MineSkinJobResponse =
  | MineSkinJobSuccessResponse
  | (MineSkinGenericResponse & {
    job?: MineSkinJobDetails;
    skin?: MineSkinJobSuccessResponse["skin"];
  });

async function fetchMineSkinJob(
  jobId: string,
): Promise<MineSkinJobSuccessResponse> {
  const mineskin = getMineSkinClient();
  const response = await mineskin(`queue/${jobId}`)

  const data = (await response.json()) as MineSkinJobResponse;

  if (!response.ok || data.success === false) {
    const status = response.ok ? 502 : response.status;
    throw new UpstreamError(status, getMineSkinErrorMessage(data));
  }

  try {
    if (!isProduction) {
      console.log(JSON.stringify(data, null, 2));
    }

    const parsed = mineSkinJobSuccessSchema.parse(data);
    return parsed;
  } catch (error) {
    logMineSkinParsingError("MineSkin job response", data, error);

    if (error instanceof z.ZodError) {
      const details = error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .filter((detail): detail is string => Boolean(detail))
        .join("; ");

      const suffix = details ? `: ${details}` : "";
      throw new UpstreamError(502, `Unexpected MineSkin job response${suffix}`);
    }

    throw new UpstreamError(502, "Unexpected MineSkin job response");
  }
}

function sanitizeMineSkinJobResponse(
  data: MineSkinJobSuccessResponse,
): MineSkinSanitizedResponse {
  let skin: MineSkinSanitizedResponse["skin"] = null;

  const skinData = data.skin;
  if (
    skinData &&
    typeof skinData === "object" &&
    "uuid" in skinData &&
    typeof skinData.uuid === "string"
  ) {
    const encryptedUrl = encryptMineSkinUuid(skinData.uuid);
    skin = { url: encryptedUrl };
  }

  return {
    success: true,
    skin,
    warnings: data.warnings ?? [],
    messages: data.messages ?? [],
  };
}

async function pollMineSkinJob(
  jobId: string,
  waitMs: number,
): Promise<{ sanitized: MineSkinSanitizedResponse, raw: MineSkinJobSuccessResponse }> {
  const maxAttempts = Math.max(1, Math.ceil(MAX_POLL_DURATION_MS / waitMs));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const jobData = await fetchMineSkinJob(jobId);
    const { status } = jobData.job;

    if (status === "completed") {
      if (!jobData.skin) {
        throw new UpstreamError(
          502,
          "MineSkin job completed but no skin data provided",
        );
      }

      return { sanitized: sanitizeMineSkinJobResponse(jobData), raw: jobData }
    }

    if (status === "failed") {
      throw new UpstreamError(502, "MineSkin job failed to complete");
    }

    if (attempt < maxAttempts - 1) {
      await delay(waitMs);
    }
  }

  throw new UpstreamError(504, "Timed out waiting for MineSkin job to finish");
}

const mineSkinErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

const jobStatusSchema = z.enum([
  "unknown",
  "waiting",
  "active",
  "processing",
  "failed",
  "completed",
]);

const mineSkinJobDetailsSchema = z
  .object({
    id: z.string(),
    status: jobStatusSchema,
    result: z.string().nullish(),
  })
  .loose();

const mineSkinValueAndSignatureSchema = z.object({
  value: z.string(),
  signature: z.string(),
});

const mineSkinSkinHashesSchema = z.object({
  skin: z.string(),
  cape: z.string().optional(),
});

const mineSkinSkinUrlsSchema = z.object({
  skin: z.string(),
  cape: z.string().optional(),
});

const mineSkinGeneratorInfoSchema = z
  .object({
    version: z.string(),
    timestamp: z.number(),
    duration: z.number(),
    account: z.string(),
    server: z.string(),
  })
  .loose();

const mineSkinSkinTextureSchema = z
  .object({
    data: mineSkinValueAndSignatureSchema,
    hash: mineSkinSkinHashesSchema.nullish(),
    url: mineSkinSkinUrlsSchema.nullish(),
  })
  .loose();

const mineSkinSkinSchema = z
  .object({
    uuid: z.string(),
    name: z.string().nullable(),
    visibility: z.enum(["public", "unlisted", "private"]),
    variant: z.enum(["classic", "slim", "unknown"]),
    texture: mineSkinSkinTextureSchema,
    generator: mineSkinGeneratorInfoSchema,
    views: z.number(),
    duplicate: z.boolean(),
  })
  .loose();

const mineSkinCreditsUsageSchema = z
  .object({
    used: z.number(),
    remaining: z.number(),
  })
  .loose();

const mineSkinMeteredUsageSchema = z
  .object({
    used: z.number(),
  })
  .loose();

const mineSkinUsageInfoSchema = z
  .object({
    credits: mineSkinCreditsUsageSchema.optional(),
    metered: mineSkinMeteredUsageSchema.optional(),
  })
  .loose();

const mineSkinSkinResultSchema = z
  .union([mineSkinSkinSchema, z.literal(false)])
  .nullish();

const mineSkinNextRequestSchema = z
  .object({
    absolute: z.number(),
    relative: z.number(),
  })
  .loose();

const mineSkinDelayInfoSchema = z
  .object({
    millis: z.number(),
    seconds: z.number().optional(),
  })
  .loose();

const mineSkinLimitInfoSchema = z
  .object({
    limit: z.number(),
    remaining: z.number(),
    reset: z.number().optional(),
  })
  .loose();

const mineSkinRateLimitInfoSchema = z
  .object({
    next: mineSkinNextRequestSchema,
    delay: mineSkinDelayInfoSchema,
    limit: mineSkinLimitInfoSchema.optional(),
  })
  .loose();

const mineSkinJobSuccessSchema = z.object({
  success: z.literal(true),
  job: z.object({
    id: z.string(),
    status: z.string(),
    timestamp: z.number(),
    result: z.string().optional(),
  }).catchall(z.unknown()),
  skin: z.object({
    uuid: z.string(),
    shortId: z.string(),
    name: z.string().nullable(),
    visibility: z.string(),
    variant: z.string(),
    texture: z.object({
      data: z.object({
        value: z.string(),
        signature: z.string()
      }).loose(),
      hash: z.object({
        cape: z.string().nullable().optional(),
      }).catchall(z.unknown()),
      url: z.object({
        skin: z.string()
      }).loose(),
    }).catchall(z.unknown()),
    generator: z.object({
      timestamp: z.number(),
      account: z.string(),
      server: z.string(),
      worker: z.string(),
      version: z.string(),
      duration: z.number(),
    }).catchall(z.unknown()),
    tags: z.array(z.unknown()),
    views: z.number(),
    duplicate: z.boolean(),
  }).optional(),
  errors: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      path: z.array(z.string()).optional(),
    })
  ).optional(),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      path: z.array(z.string()).optional(),
    })
  ).optional(),
  messages: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      path: z.array(z.string()).optional(),
    })
  ).optional(),
  links: z.object({
    self: z.string().optional(),
  }).optional(),
}).loose();

const mineSkinSanitizedSkinSchema = z.object({
  url: z.string(),
});

const mineSkinCapeSchema = z.object({
  uuid: z.string(),
  alias: z.string(),
  url: z.url(),
});

const mineSkinSanitizedResponseSchema = z.object({
  success: z.literal(true),
  skin: mineSkinSanitizedSkinSchema.nullable(),
  warnings: z.array(mineSkinErrorSchema).default([]),
  messages: z.array(mineSkinErrorSchema).default([]),
});

const MAX_SKIN_FILE_SIZE = 1024 * 1024

export const uploadQuerySchema = z.object({
  waitMs: z.coerce.number().int().min(250).max(10_000).optional().default(5_000)
});

export const uploadBodySchema = z.object({
  file: z.file().min(1).max(MAX_SKIN_FILE_SIZE).mime("image/png"),
  variant: uploadFormSchema.shape.variant,
  name: uploadNameSchema,
  capeUuid: uploadFormSchema.shape.capeUuid.optional(),
})

type MineSkinError = z.infer<typeof mineSkinErrorSchema>;
type MineSkinJobDetails = z.infer<typeof mineSkinJobDetailsSchema>;
type MineSkinJobSuccessResponse = z.infer<typeof mineSkinJobSuccessSchema>;
type MineSkinSanitizedResponse = z.infer<typeof mineSkinSanitizedResponseSchema>;
type MineSkinCape = z.infer<typeof mineSkinCapeSchema>;

type MineSkinRateLimitInfo = z.infer<typeof mineSkinRateLimitInfoSchema>;
type MineSkinUsageInfo = z.infer<typeof mineSkinUsageInfoSchema>;

type MineSkinGenericResponse = {
  success?: boolean | undefined;
  errors?: MineSkinError[] | undefined;
  warnings?: MineSkinError[] | undefined;
  messages?: MineSkinError[] | undefined;
  rateLimit?: MineSkinRateLimitInfo | null | undefined;
  usage?: MineSkinUsageInfo | null | undefined;
};

function getFirstMineSkinMessage(items?: MineSkinError[]): string | undefined {
  return items?.find((item) => item?.message)?.message;
}

function getMineSkinErrorMessage(response: MineSkinGenericResponse): string {
  return (
    getFirstMineSkinMessage(response.errors) ??
    getFirstMineSkinMessage(response.warnings) ??
    getFirstMineSkinMessage(response.messages) ??
    "MineSkin request failed"
  );
}

function getMineSkinClient(): KyInstance {
  if (!MINESKIN_API_KEY) throw new ConfigurationError("MineSkin API key is not configured")

  const keyT = MINESKIN_API_KEY.trim()
  if (!keyT) throw new ConfigurationError("MineSkin API key is empty")

  const Authorization = keyT.startsWith("Bearer ") ? keyT : `Bearer ${keyT}`

  const client = inheritClient.extend((opts) => ({
    ...opts,
    prefixUrl: MINESKIN_BASE_URL,
    headers: {
      "User-Agent": MINESKIN_USER_AGENT,
      Authorization,
    }
  }))

  return client
}

type MineSkinEnqueueResponse = MineSkinGenericResponse & {
  job?: MineSkinJobDetails;
  skin?: MineSkinJobSuccessResponse["skin"];
};

function logMineSkinParsingError(
  context: string,
  response: unknown,
  error: unknown,
): void {
  const payload: Record<string, unknown> = { response };

  if (error instanceof Error) {
    payload.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined) {
    payload.error = error;
  }

  console.error(`[MineSkin] Failed to parse ${context}`, payload);
}

async function enqueueMineSkinJob(
  formData: FormData,
): Promise<MineSkinJobDetails> {
  const mineskin = getMineSkinClient();

  const res = await mineskin.post(`queue`, {
    body: formData
  });

  const data = (await res.json()) as MineSkinEnqueueResponse;

  if (!res.ok || data.success === false || !data.job) {
    const status = res.ok ? 502 : res.status;
    throw new UpstreamError(status, getMineSkinErrorMessage(data));
  }

  try {
    return mineSkinJobDetailsSchema.parse(data.job);
  } catch (e) {
    logMineSkinParsingError("MineSkin job enqueue response", data, e);
    throw new UpstreamError(502, "Unexpected MineSkin job response");
  }
}

type MineSkinCapeResponse = MineSkinGenericResponse & {
  capes?: (MineSkinCape & { supported?: boolean })[];
};

function ensureHttpsTextureUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch (error) {
    console.warn("Failed to normalise cape URL", error);
    return url;
  }
}

function encryptMineSkinUuid(uuid: string): string {
  function getAesSecretKey(): Buffer {
    if (!MINESKIN_AES_SECRET_KEY) {
      throw new ConfigurationError("AES_SECRET_KEY environment variable is not set");
    }

    // Use SHA-256 to derive a 32-byte key
    return createHash("sha256").update(MINESKIN_AES_SECRET_KEY).digest();
  }

  const key = getAesSecretKey();
  const iv = randomBytes(16);

  const cipher = createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(uuid, "utf8"),
    cipher.final(),
  ]);

  const combined = Buffer.concat([iv, encrypted]);
  const encoded = combined.toString("base64");

  return `${ENCRYPTED_URL_SCHEME}${encoded}`;
}

function encryptUrl(url: string): string {
  if (!url.startsWith(MINESKIN_URL_PREFIX)) {
    throw new Error("MineSkin encryption only supports https://minesk.in URLs");
  }

  const uuid = url.slice(MINESKIN_URL_PREFIX.length);
  return encryptMineSkinUuid(uuid);
}

function encryptMineSkinUrls(obj: unknown): unknown {
  if (typeof obj === "string") {
    // Check if it's a URL (basic check)
    if (obj.startsWith(MINESKIN_URL_PREFIX)) {
      return encryptUrl(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(encryptMineSkinUrls);
  }

  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = encryptMineSkinUrls(value);
    }
    return result;
  }

  return obj;
}

async function fetchMineSkinSupportedCapes(): Promise<MineSkinCape[]> {
  const mineskin = getMineSkinClient()
  const response = await mineskin(`capes`)

  const data = (await response.json()) as MineSkinCapeResponse;

  if (!response.ok || data.success === false) {
    const status = response.ok ? 502 : response.status;
    throw new UpstreamError(status, getMineSkinErrorMessage(data));
  }

  const capes = (data.capes ?? [])
    .filter((cape) => cape.supported)
    .map((cape) => ({
      uuid: cape.uuid,
      alias: cape.alias,
      url: ensureHttpsTextureUrl(cape.url) ?? cape.url,
    }));

  try {
    const parsed = z.array(mineSkinCapeSchema).parse(capes);
    return encryptMineSkinUrls(parsed) as MineSkinCape[];
  } catch (error) {
    logMineSkinParsingError("MineSkin cape response", capes, error);
    throw new UpstreamError(502, "Unexpected MineSkin cape response");
  }
}

let cachedSupportedCapes: { data: MineSkinCape[]; fetchedAt: number } | null = null;

async function getSupportedCapes(): Promise<MineSkinCape[]> {
  const now = Date.now();
  if (
    cachedSupportedCapes &&
    now - cachedSupportedCapes.fetchedAt < CAPE_CACHE_TTL_MS
  ) {
    return cachedSupportedCapes.data;
  }

  const capes = await fetchMineSkinSupportedCapes();
  cachedSupportedCapes = { data: capes, fetchedAt: now };
  return capes;
}

export async function uploadSkin(
  query: z.infer<typeof uploadQuerySchema>,
  body: z.infer<typeof uploadBodySchema>
) {
  let waitMs = DEFAULT_POLL_INTERVAL_MS;

  try {
    waitMs = query.waitMs ?? DEFAULT_POLL_INTERVAL_MS;
  } catch (error) {
    return { status: 400, error: wrapError(error).error }
  }

  const { file, variant, capeUuid, name } = body

  if (!isFileLike(file)) {
    return { status: 400, error: "A skin file must be provided" }
  }

  try {
    if (capeUuid) {
      const supportedCapes = await getSupportedCapes();

      if (!supportedCapes.some((cape) => cape.uuid === capeUuid)) {
        return { status: 400, error: "Requested cape is not supported" }
      }
    }

    const upstreamFormData = new FormData();

    upstreamFormData.set("file", file);
    upstreamFormData.set("variant", variant);

    if (name) {
      upstreamFormData.set("name", name);
    }

    const job = await enqueueMineSkinJob(upstreamFormData);

    const result = await pollMineSkinJob(job.id, waitMs);
    return result
  } catch (e) {
    console.error("MineSkin upload failed", e);
    throw e
  }
}

export async function deleteOldSkins({
  trx, uuid, nickname
}: {
  trx: Transaction<DB>, uuid: string, nickname: string
}) {
  const historyExist = await trx
    .selectFrom("sr_player_history")
    .select([
      "uuid",
      "skin_identifier",
    ])
    .where("uuid", "=", uuid)
    .orderBy("timestamp", "asc")
    .execute()

  const toDelete = historyExist.length > 2 ? historyExist.slice(0, -2) : [];

  if (toDelete.length) {
    const ids = toDelete.map(d => d.skin_identifier)

    const cs = await trx
      .selectFrom("sr_custom_skins")
      .select(["signature"])
      .where("name", "in", ids)
      .execute()

    const signatures = cs.map(d => d.signature);

    await Promise.all([
      trx
        .deleteFrom("sr_url_skins")
        .where("signature", "in", signatures)
        .execute(),
      trx
        .deleteFrom("sr_player_history")
        .where("skin_identifier", "in", ids)
        .execute(),
      trx
        .deleteFrom("sr_custom_skins")
        .where("name", "in", ids)
        .execute()
    ])

    const client = minio.get();

    for (const identifier of ids) {
      await client.removeObject(BUCKETS.AVATARS, getAvatarName(nickname, identifier))
    }
  }
}

type UploadPayload = {
  job: {
    id: string,
    status: any
  },
  result: {
    url: string
  } | null
}

export type SkinVariant = "CLASSIC" | "SLIM"
export type SkinType = "PLAYER" | "CUSTOM"

export async function upload(
  nickname: string,
  query: z.infer<typeof uploadQuerySchema>,
  body: z.infer<typeof uploadBodySchema>,
  { status }: { status: Context["status"] }
): Promise<UploadPayload> {
  const uploadResult = await uploadSkin(query, body)

  if ("status" in uploadResult) {
    throw status(uploadResult.status, uploadResult.error)
  }

  const { raw, sanitized } = uploadResult;

  const skin = raw.skin;

  if (!skin) {
    return {
      job: {
        id: raw.job.id,
        status: raw.job.status
      },
      result: null
    }
  }

  const uuid = await getPlayerUUID(nickname);
  const name = `sr-${nickname}-${nanoid(4)}`

  const { signature, value } = skin.texture.data

  const updateResult = await skins.transaction().execute(async (trx) => {
    await deleteOldSkins({ trx, uuid, nickname });

    type CustomPayload = {
      name: string, // equals skin_identifier
      signature: string,
      value: string
    }

    const customPayload: CustomPayload = {
      name, signature, value
    }

    type UrlPayload = {
      signature: string,
      value: string,
      url: string,
      mine_skin_id: string,
      skin_variant: SkinVariant
    }

    const urlPayload: UrlPayload = {
      signature,
      value,
      url: skin.texture.url.skin,
      mine_skin_id: skin.uuid,
      skin_variant: skin.variant.toUpperCase() as SkinVariant
    }

    await Promise.all([
      trx
        .insertInto("sr_custom_skins")
        .values(customPayload)
        .executeTakeFirstOrThrow(),
      trx
        .insertInto("sr_url_skins")
        .values(urlPayload)
        .onDuplicateKeyUpdate({
          url: urlPayload.url
        })
        .executeTakeFirstOrThrow()
    ])

    const skin_identifier = customPayload.name;

    type ResultPayload = {
      uuid: string,
      skin_identifier: string,
      skin_type: SkinType,
      skin_variant: SkinVariant
    }

    const resultPayload: ResultPayload = {
      uuid,
      skin_identifier,
      skin_type: "CUSTOM",
      skin_variant: skin.variant.toUpperCase() as SkinVariant
    }

    await trx
      .insertInto("sr_players")
      .values(resultPayload)
      .onDuplicateKeyUpdate({
        skin_identifier,
        skin_type: "CUSTOM"
      })
      .executeTakeFirstOrThrow()

    type HistoryPayload = {
      skin_identifier: string,
      skin_type: SkinType,
      skin_variant: SkinVariant,
      uuid: string,
      timestamp: number;
    }

    const historyPayload: HistoryPayload = {
      skin_identifier: customPayload.name,
      skin_type: "CUSTOM",
      skin_variant: urlPayload.skin_variant,
      uuid,
      timestamp: Math.floor(Date.now() / 1000)
    }

    await trx
      .insertInto("sr_player_history")
      .values(historyPayload)
      .executeTakeFirstOrThrow()

    return { url: urlPayload.url }
  })

  initPlayerSkin(nickname)

  const payload = {
    result: updateResult,
    job: {
      id: raw.job.id,
      status: raw.job.status
    },
  }

  return payload
}

//#endregion