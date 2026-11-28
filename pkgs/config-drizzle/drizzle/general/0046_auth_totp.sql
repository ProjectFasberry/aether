-- TOTP secrets and one-time backup codes for account 2FA. The TOTP secret is
-- encrypted with AUTH_TOTP_KEY; backup codes are stored as SHA-256 hashes and
-- consumed once.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "account_totp" (
  "account_id" integer PRIMARY KEY
    REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "secret" text NOT NULL,
  "confirmed_at" timestamptz,
  "last_used_step" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "account_backup_codes" (
  "id" bigserial PRIMARY KEY,
  "account_id" integer NOT NULL
    REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "code_hash" text NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "account_backup_codes_unused_idx"
  ON "account_backup_codes" ("account_id")
  WHERE "used_at" IS NULL;
