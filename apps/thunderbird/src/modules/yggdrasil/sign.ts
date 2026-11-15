import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { signingKeys } from "./signing-keys.model";

/**
 * Shared Yggdrasil texture signing.
 *
 * The client verifies `textures` against `signaturePublickey` from the API
 * metadata, so every value we hand out (profile response and uploaded skin
 * rows) must be signed with the same stable key from `signing_keys`.
 */

/** Yggdrasil signs the base64 value string with RSA-SHA1. */
const SIGN_ALGORITHM = "sha1";

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

export function signTextureValue({
  url,
  variant,
  profileId,
  profileName,
}: {
  url: string
  variant?: "CLASSIC" | "SLIM" | null
  profileId?: string
  profileName?: string
}): { value: string, signature: string } {
  const textures: Record<string, unknown> = {
    SKIN: {
      url,
      ...(variant === "SLIM" ? { metadata: { model: "slim" } } : {}),
    },
  };

  const payload = {
    timestamp: Date.now(),
    ...(profileId ? { profileId } : {}),
    ...(profileName ? { profileName } : {}),
    textures,
  };

  const value = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = sign(SIGN_ALGORITHM, Buffer.from(value), loadPrivateKey()).toString("base64");

  return { value, signature };
}
