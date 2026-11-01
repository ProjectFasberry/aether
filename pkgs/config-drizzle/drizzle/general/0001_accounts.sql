-- Accounts are the canonical identity; AUTH stays in place as the LimboAuth
-- compatibility table until the plugin is removed.
--
-- Idempotent on purpose: it runs once per environment (dev, prod) and is safe to
-- re-run while the cutover is being tested.

CREATE TABLE IF NOT EXISTS "accounts" (
	"id" integer GENERATED ALWAYS AS IDENTITY,
	"uuid" uuid NOT NULL,
	"nickname" text NOT NULL,
	"lower_nickname" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_accounts_uuid" ON "accounts" USING btree ("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_accounts_lower_nickname" ON "accounts" USING btree ("lower_nickname");

CREATE TABLE IF NOT EXISTS "account_credentials" (
	"account_id" integer,
	"password_hash" text NOT NULL,
	"password_updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "account_credentials_pkey" PRIMARY KEY ("account_id"),
	CONSTRAINT "account_credentials_account_id_accounts_id_fk"
		FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: copy the UUID verbatim (no re-derivation, the 9 Mojang UUIDs stay as
-- they are), keep the registration time, skip rows without a UUID.
INSERT INTO "accounts" ("uuid", "nickname", "lower_nickname", "created_at")
SELECT
	"UUID"::uuid,
	"NICKNAME",
	"LOWERCASENICKNAME",
	to_timestamp(coalesce("REGDATE", 0) / 1000.0)
FROM "AUTH"
WHERE btrim(coalesce("UUID", '')) <> ''
ON CONFLICT ("lower_nickname") DO NOTHING;

INSERT INTO "account_credentials" ("account_id", "password_hash")
SELECT
	a."id",
	au."HASH"
FROM "AUTH" au
JOIN "accounts" a ON a."lower_nickname" = au."LOWERCASENICKNAME"
WHERE btrim(coalesce(au."HASH", '')) <> ''
ON CONFLICT ("account_id") DO NOTHING;
