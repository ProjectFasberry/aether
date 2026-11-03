import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { skinsService } from "#/shared/services/skins";
import { minioService } from "#/shared/services/minio";
import { undash } from "./profile.model";
import { signingKeys } from "./signing-keys.model";

/**
 * `textures` property for the Yggdrasil profile.
 *
 * The client verifies texture signatures against `signaturePublickey` from our
 * API metadata, so the property must be signed by us: Mojang/MineSkin signatures
 * (what SkinsRestorer serves) do not pass that check. The skin itself still
 * points at the URL stored in the skins database, which is why
 * `textures.minecraft.net` stays in `skinDomains`.
 *
 * The key lives in `signing_keys` (see signing-keys.model.ts) and must be
 * stable: a new key on every boot invalidates every signature the client has
 * already cached.
 */


/** Yggdrasil signs the base64 value string with RSA-SHA1. */
const SIGN_ALGORITHM = "sha1";

const SLIM_VARIANTS = new Set(["SLIM", "slim"]);

let cachedPrivateKey: ReturnType<typeof createPrivateKey> | null = null;
let cachedPublicKeyPem: string | null = null;

function loadPrivateKey(): ReturnType<typeof createPrivateKey> {
  if (cachedPrivateKey) return cachedPrivateKey;

  cachedPrivateKey = createPrivateKey(signingKeys.get().privateKey);

  return cachedPrivateKey;
}

/** RSAPublicKey in SPKI PEM, served by `GET /yggdrasil`. */
export function signaturePublicKey(): string {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;

  cachedPublicKeyPem = createPublicKey(loadPrivateKey())
    .export({ type: "spki", format: "pem" })
    .toString();

  return cachedPublicKeyPem;
}

export type TexturesProperty = {
  name: "textures";
  value: string;
  signature: string;
};

const isHttpUrl = (value: string | null | undefined): value is string =>
  Boolean(value) && typeof value === "string" && /^https?:\/\//i.test(value);

/**
 * Current skin of a player. The history lives in Redis (no TTL) and is filled by
 * `initSkin` at registration and on every skin change, so a cold cache means the
 * key was evicted or the player never went through the client: rebuild it once
 * from the skins database instead of silently serving the default skin.
 */
async function currentSkin(nickname: string, uuid: string) {
  const cached = await skinsService.skin.getCachedSkinsPayload(nickname);

  if (cached?.length) return cached[0];

  const warmed = await skinsService.skin.initSkin({
    nickname,
    uuid,
    minio: minioService.getInstance,
  });

  if (!warmed) return null;

  const fresh = await skinsService.skin.getCachedSkinsPayload(nickname);

  return fresh?.[0] ?? null;
}

export const texturesService = {
  /**
   * Builds and signs the `textures` property for an account. Returns `null` when
   * the account has no usable skin, so the client falls back to the default one.
   */
  async property(nickname: string, uuid: string): Promise<TexturesProperty | null> {
    const skin = await currentSkin(nickname, uuid);

    if (!skin || !isHttpUrl(skin.skin_url)) return null;

    const slim = SLIM_VARIANTS.has(skin.skin_variant ?? "");
    const textures: Record<string, unknown> = {
      SKIN: {
        url: skin.skin_url,
        ...(slim ? { metadata: { model: "slim" } } : {}),
      },
    };

    const payload = {
      timestamp: Date.now(),
      profileId: undash(uuid),
      profileName: nickname,
      textures,
    };

    const value = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = sign(SIGN_ALGORITHM, Buffer.from(value), loadPrivateKey()).toString("base64");

    return { name: "textures", value, signature };
  },
};
