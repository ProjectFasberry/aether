import { skins } from "#/shared/database/skins-db";
import * as z from "zod";
import { createHash } from "node:crypto";
import { sql, type Transaction } from "kysely";
import type { DB } from "@gen/db/skins";
import { nanoid } from "nanoid";
import { skinsService } from "../../../shared/services/skins";
import { playerService } from "#/shared/services/player";
import { minioService } from "#/shared/services/minio";
import { BUCKETS, S3 } from "#/shared/minio/client";
import { getObjectUrl } from "#/helpers/volume";
import { signTextureValue } from "#/modules/yggdrasil/sign";
import { logger } from "@repo/shared/utils/logger";
import { recordSkinAudit } from "@repo/core/modules/skins/index";
import { allowRequest } from "#/shared/services/rate-limit";
import { assertValidSkinFile, InvalidSkinFileError } from "./skin-file";

export { InvalidSkinFileError } from "./skin-file";

const MAX_SKIN_FILE_SIZE = 1024 * 1024

const uploadFormSchema = z.object({
  variant: z.enum(["classic", "slim"]),
});

export class RateLimitedError extends Error {
  constructor() {
    super("RATE_LIMITED");
    this.name = "RateLimitedError";
  }
}

export const uploadBodySchema = z.object({
  file: z.file().min(1).max(MAX_SKIN_FILE_SIZE).mime("image/png"),
  variant: uploadFormSchema.shape.variant,
})

export type SkinVariant = "CLASSIC" | "SLIM"
export type SkinType = "PLAYER" | "CUSTOM"

type UploadPayload = {
  url: string
}

type LocalSkinUpload = {
  /** Short id for the varchar(36) `mine_skin_id` column. */
  id: string
  key: string
  url: string
  value: string
  signature: string
  variant: SkinVariant
}

/**
 * Stores the PNG in our `skins` bucket and signs the texture property with the
 * Yggdrasil key. MineSkin is no longer involved: the client trusts our key, so
 * the value/signature pair is generated here.
 */
async function uploadSkin(
  body: z.infer<typeof uploadBodySchema>,
  profile: { uuid: string, nickname: string },
): Promise<LocalSkinUpload> {
  const { file, variant } = body

  await assertValidSkinFile(file)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const hash = createHash("sha256").update(bytes).digest("hex")
  const key = `textures/${hash}.png`
  const url = getObjectUrl(BUCKETS.SKINS, key)

  const skinVariant = variant.toUpperCase() as SkinVariant

  let signed: { value: string, signature: string }
  try {
    await S3.getClient(BUCKETS.SKINS).write(key, bytes, { type: "image/png" })

    signed = signTextureValue({
      url,
      variant: skinVariant,
      profileId: profile.uuid.replace(/-/g, ""),
      profileName: profile.nickname,
    })
  } catch (error) {
    logger.error({ message: "skins.metric upload_error", error })
    throw error
  }

  const { value, signature } = signed

  return { id: hash.slice(0, 32), key, url, value, signature, variant: skinVariant }
}

export async function deleteOldSkins({
  trx, uuid
}: {
  trx: Transaction<DB>, uuid: string
}): Promise<string[]> {
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

  if (!toDelete.length) return [];

  const ids = toDelete.map(d => d.skin_identifier)

  const cs = await trx
    .selectFrom("sr_custom_skins")
    .select(["signature"])
    .where("name", "in", ids)
    .execute()

  const signatures = [...new Set(cs.map(d => d.signature))];

  // Only this player's history rows may go; another player can reference the
  // same skin name (public skins, old data).
  await trx
    .deleteFrom("sr_player_history")
    .where("skin_identifier", "in", ids)
    .where("uuid", "=", uuid)
    .execute()

  const [historyRefs, playerRefs] = await Promise.all([
    trx
      .selectFrom("sr_player_history")
      .select("skin_identifier")
      .where("skin_identifier", "in", ids)
      .execute(),
    trx
      .selectFrom("sr_players")
      .select("skin_identifier")
      .where("skin_identifier", "in", ids)
      .execute(),
  ])

  const stillReferenced = new Set(
    [...historyRefs, ...playerRefs]
      .map((ref) => ref.skin_identifier)
      .filter((id): id is string => Boolean(id)),
  )
  const removableIds = ids.filter((id) => !stillReferenced.has(id))

  if (removableIds.length) {
    await trx
      .deleteFrom("sr_custom_skins")
      .where("name", "in", removableIds)
      .execute()

    // Ownership rows follow the asset; audit rows are history and stay.
    await trx
      .deleteFrom("skin_owners")
      .where("skin_name", "in", removableIds)
      .execute()
  }

  // `sr_url_skins` is keyed by signature, which another custom skin can share:
  // only orphan rows may go.
  if (signatures.length) {
    await trx
      .deleteFrom("sr_url_skins")
      .where("signature", "in", signatures)
      .where((eb) => eb.not(eb.exists(
        eb.selectFrom("sr_custom_skins")
          .select("sr_custom_skins.signature")
          .whereRef("sr_custom_skins.signature", "=", "sr_url_skins.signature"),
      )))
      .execute()
  }

  return removableIds
}

export async function upload(
  nickname: string,
  body: z.infer<typeof uploadBodySchema>,
): Promise<UploadPayload> {
  // Cooldown first: a spam attempt must not consume the daily quota.
  if (!await allowRequest("skins:upload:cooldown", nickname.toLowerCase(), 1, 30)) {
    throw new RateLimitedError()
  }

  if (!await allowRequest("skins:upload:day", nickname.toLowerCase(), 5, 24 * 60 * 60)) {
    throw new RateLimitedError()
  }

  const uuid = await playerService.getUuid(nickname);
  const name = `sr-${nickname}-${nanoid(4)}`
  const local = await uploadSkin(body, { uuid, nickname })

  const updateResult = await skins.transaction().execute(async (trx) => {
    await deleteOldSkins({ trx, uuid });

    type CustomPayload = {
      name: string, // equals skin_identifier
      signature: string,
      value: string
    }

    const customPayload: CustomPayload = {
      name,
      signature: local.signature,
      value: local.value,
    }

    type UrlPayload = {
      signature: string,
      value: string,
      url: string,
      mine_skin_id: string,
      skin_variant: SkinVariant
    }

    const urlPayload: UrlPayload = {
      signature: local.signature,
      value: local.value,
      url: local.url,
      mine_skin_id: local.id,
      skin_variant: local.variant,
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
      skin_variant: local.variant,
    }

    await trx
      .insertInto("sr_players")
      .values(resultPayload)
      .onDuplicateKeyUpdate({
        skin_identifier,
        skin_type: "CUSTOM",
        skin_variant: resultPayload.skin_variant
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

    // Ownership and audit are side tables added in `0001_skins_ownership.sql`;
    // `overlay.ts` declares them until the generated types catch up.
    await trx
      .insertInto("skin_owners")
      .values({
        skin_name: name,
        owner_uuid: uuid,
        is_public: 0,
        created_at: Math.floor(Date.now() / 1000),
      })
      .ignore()
      .execute()

    await recordSkinAudit(trx, {
      actorUuid: uuid,
      targetUuid: null,
      action: "upload",
      skinName: name,
    })

    return { url: urlPayload.url }
  })

  // The rows are committed: a cache or head-render failure must not turn a
  // successful upload into a 5xx, or the panel shows an error for a skin the
  // game already has. The next history request rebuilds both.
  await skinsService.skin.invalidate(nickname).catch((error) => {
    logger.warn({ message: "Skin cache invalidate failed after upload", nickname, error });
  })
  await skinsService.skin.initSkin({
    nickname,
    minio: minioService.getInstance,
  }).catch((error) => {
    logger.warn({ message: "Skin head init failed after upload", nickname, error });
  })

  return { url: updateResult.url }
}
