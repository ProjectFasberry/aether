import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { skinsService } from "#/shared/services/skins";
import { undash } from "./profile.model";

/**
 * `textures` property for the Yggdrasil profile.
 *
 * The client verifies texture signatures against `signaturePublickey` from our
 * API metadata, so the property must be signed by us: Mojang/MineSkin signatures
 * (what SkinsRestorer serves) do not pass that check. The skin itself still
 * points at the URL stored in the skins database, which is why
 * `textures.minecraft.net` stays in `skinDomains`.
 *
 * The signing key is `YGGDRASIL_PRIVATE_KEY` (PEM or base64 of the PEM). It must
 * be stable: a new key on every boot invalidates every signature the client has
 * already cached.
 */
const KEY_ENV = "YGGDRASIL_PRIVATE_KEY";

/** Yggdrasil signs the base64 value string with RSA-SHA1. */
const SIGN_ALGORITHM = "sha1";

const SLIM_VARIANTS = new Set(["SLIM", "slim"]);

let cachedPrivateKey: ReturnType<typeof createPrivateKey> | null = null;
let cachedPublicKeyPem: string | null = null;

function normalizePem(value: string): string {
  const trimmed = value.trim();

  if (trimmed.includes("BEGIN")) return trimmed.replace(/\\n/g, "\n");

  // Infisical stores single-line secrets comfortably; base64 is accepted too.
  return Buffer.from(trimmed, "base64").toString("utf8");
}

function loadPrivateKey(): ReturnType<typeof createPrivateKey> {
  if (cachedPrivateKey) return cachedPrivateKey;

  const fromEnv = Bun.env[KEY_ENV];

  if (fromEnv && fromEnv.trim()) {
    cachedPrivateKey = createPrivateKey(normalizePem(fromEnv));

    return cachedPrivateKey;
  }

  // Dev fallback: ephemeral key, signatures only live while the process does.
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

  cachedPrivateKey = privateKey;

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

export const texturesService = {
  /**
   * Builds and signs the `textures` property for an account. Returns `null` when
   * the account has no usable skin, so the client falls back to the default one.
   */
  async property(nickname: string, uuid: string): Promise<TexturesProperty | null> {
    const history = await skinsService.skin.getCachedSkinsPayload(nickname);
    const skin = history?.[0];

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
