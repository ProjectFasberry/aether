import { skins } from "#/shared/database/skins-db";
import { getAvatarName } from "#/helpers/volume";
import { getPlayerUUID } from "#/utils/player/uuid";
import { minio, BUCKETS } from "#/shared/minio/client";
import { isProduction, env } from "#/shared/env";
import * as z from "zod";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";
import type { Transaction } from "kysely";
import type { DB } from "@repo/shared/types/db/skins";
import { client as inheritClient } from "#/shared/api/client";
import { wrapError } from "#/utils";
import type { KyInstance } from "ky";
import type { Context } from "elysia";
import { nanoid } from "nanoid";
import { skinsService } from "./index.model";

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
  if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
  return 502;
}
function isFileLike(value: unknown): value is Blob {
  if (!value || typeof value === "string") return false;
  return typeof (value as Blob).arrayBuffer === "function";
}

export function normalizeStatus(
  status: number, allowed: number[], fallback: number,
): number {
  const sanitized = sanitizeStatus(status);
  const safeFallback = sanitizeStatus(fallback);
  return allowed.map(sanitizeStatus).includes(sanitized) ? sanitized : safeFallback;
}

type MineSkinJobResponse =
  | MineSkinJobSuccessResponse
  | (MineSkinGenericResponse & {
    job?: MineSkinJobDetails;
    skin?: MineSkinJobSuccessResponse["skin"];
  });

async function fetchMineSkinJob(jobId: string): Promise<MineSkinJobSuccessResponse> {
  const mineskin = getMineSkinClient();
  const response = await mineskin(`queue/${jobId}`)

  const data = (await response.json()) as MineSkinJobResponse;

  if (!response.ok || data.success === false) {
    const status = response.ok ? 502 : response.status;
    throw new UpstreamError(status, getMineSkinErrorMessage(data));
  }

  try {
    !isProduction && console.log(JSON.stringify(data, null, 2));

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

function sanitizeMineSkinJobResponse(data: MineSkinJobSuccessResponse): MineSkinSanitizedResponse {
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
  jobId: string, waitMs: number,
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
  if (!env.MINESKIN_API_KEY) throw new ConfigurationError("MineSkin API key is not configured")

  const keyT = env.MINESKIN_API_KEY.trim()
  if (!keyT) throw new ConfigurationError("MineSkin API key is empty")

  const client = inheritClient.extend((opts) => ({
    ...opts,
    prefixUrl: MINESKIN_BASE_URL,
    headers: {
      "User-Agent": MINESKIN_USER_AGENT,
      Authorization: keyT.startsWith("Bearer ") ? keyT : `Bearer ${keyT}`,
    }
  }))

  return client
}

type MineSkinEnqueueResponse = MineSkinGenericResponse & {
  job?: MineSkinJobDetails;
  skin?: MineSkinJobSuccessResponse["skin"];
};

function logMineSkinParsingError(
  context: string, response: unknown, error: unknown,
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

async function enqueueMineSkinJob(fd: FormData): Promise<MineSkinJobDetails> {
  const mineskin = getMineSkinClient();

  const res = await mineskin.post(`queue`, {
    body: fd
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
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch (e) {
    console.warn("Failed to normalise cape URL", e);
    return url;
  }
}

function encryptMineSkinUuid(uuid: string): string {
  function getAesSecretKey(): Buffer {
    if (!env.MINESKIN_AES_SECRET_KEY) {
      throw new ConfigurationError("AES_SECRET_KEY environment variable is not set");
    }

    // Use SHA-256 to derive a 32-byte key
    return createHash("sha256").update(env.MINESKIN_AES_SECRET_KEY).digest();
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

  if (Array.isArray(obj)) return obj.map(encryptMineSkinUrls);

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

    const client = minio.getInstance();

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

  skinsService.skin.initSkin({
    nickname,
    minio: minio.getInstance,
  })

  const payload = {
    result: updateResult,
    job: {
      id: raw.job.id,
      status: raw.job.status
    },
  }

  return payload
}
