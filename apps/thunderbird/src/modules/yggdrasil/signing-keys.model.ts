import { createPrivateKey, createPublicKey, generateKeyPairSync } from "node:crypto";
import { general } from "#/shared/database/general-db";
import { isProduction } from "#/shared/env";
import { yggdrasilLogger } from "./logger.model";

/**
 * Yggdrasil texture signing keys.
 *
 * The key must survive restarts (a new key invalidates every signature the
 * client has cached), so it lives in `signing_keys` instead of env. The first
 * boot imports the old `YGGDRASIL_PRIVATE_KEY` value, after which the env entry
 * can be removed.
 */
const KEY_ENV = "YGGDRASIL_PRIVATE_KEY";
const ALLOW_EPHEMERAL_ENV = "YGGDRASIL_ALLOW_EPHEMERAL_KEY";

export type SigningKeyPair = {
  privateKey: string;
  publicKey: string;
};

let cached: SigningKeyPair | null = null;

function normalizePem(value: string): string {
  const trimmed = value.trim();

  if (trimmed.includes("BEGIN")) return trimmed.replace(/\\n/g, "\n");

  return Buffer.from(trimmed, "base64").toString("utf8");
}

function fromPem(pem: string): SigningKeyPair {
  const key = createPrivateKey(normalizePem(pem));

  return {
    privateKey: key.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: createPublicKey(key).export({ type: "spki", format: "pem" }).toString(),
  };
}

function generate(): SigningKeyPair {
  if (isProduction && Bun.env[ALLOW_EPHEMERAL_ENV] !== "true") {
    throw new Error(
      `${KEY_ENV} is missing and signing_keys has no active key: ` +
        `set the key once (or, for local dev only, ${ALLOW_EPHEMERAL_ENV}=true).`,
    );
  }

  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

  yggdrasilLogger.warn(
    `${KEY_ENV} is missing; generated a new signing key for this environment`,
  );

  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

export const signingKeys = {
  async ensure(): Promise<SigningKeyPair> {
    if (cached) return cached;

    const row = await general
      .selectFrom("signing_keys")
      .select(["private_key", "public_key"])
      .where("active", "=", true)
      .orderBy("id", "desc")
      .limit(1)
      .executeTakeFirst();

    if (row) {
      cached = { privateKey: row.private_key, publicKey: row.public_key };
      return cached;
    }

    const fromEnv = Bun.env[KEY_ENV]?.trim();
    const pair = fromEnv ? fromPem(fromEnv) : generate();

    try {
      await general
        .insertInto("signing_keys")
        .values({
          algorithm: "rsa-sha1",
          private_key: pair.privateKey,
          public_key: pair.publicKey,
          active: true,
        })
        .execute();
    } catch {
      // Another replica won the race: a partial unique index allows one active
      // key, so use the row it wrote instead of our own pair.
      const winner = await general
        .selectFrom("signing_keys")
        .select(["private_key", "public_key"])
        .where("active", "=", true)
        .orderBy("id", "desc")
        .limit(1)
        .executeTakeFirst();

      if (!winner) throw new Error("Failed to store the Yggdrasil signing key");

      cached = { privateKey: winner.private_key, publicKey: winner.public_key };
      return cached;
    }

    yggdrasilLogger.info(
      fromEnv ? `signing key imported from ${KEY_ENV}` : "signing key generated",
    );

    cached = pair;
    return cached;
  },

  get(): SigningKeyPair {
    if (!cached) throw new Error("Signing keys are not initialised");

    return cached;
  },
};
