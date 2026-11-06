-- Economy ledger foundation (MN-148).
--
-- Balances move from the plugin tables (playerpoints_points, cmi_users) into
-- `wallets`, and every change becomes an append-only `ledger_entries` row.
-- The plugin tables stay as a projection that the service keeps in sync; if a
-- projection write fails, `grant_jobs` retries it out of band.
--
-- Idempotency: a business key (order_id, reason) may be applied once. Retries
-- of a purchase or a referral hit the existing entry and return its balance
-- instead of crediting twice.
--
-- Idempotent DDL on purpose: it runs once per environment (dev, prod).

CREATE TABLE IF NOT EXISTS "wallets" (
  "nickname" text NOT NULL,
  "currency" text NOT NULL,
  "balance" bigint NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("nickname", "currency"),
  CONSTRAINT "wallets_balance_non_negative" CHECK ("balance" >= 0)
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "nickname" text NOT NULL,
  "currency" text NOT NULL,
  "delta" bigint NOT NULL,
  "balance_after" bigint NOT NULL,
  "reason" text NOT NULL,
  "order_id" text,
  "actor" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ledger_entries_order_reason_uq"
  ON "ledger_entries" ("order_id", "reason")
  WHERE "order_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ledger_entries_nickname_created_idx"
  ON "ledger_entries" ("nickname", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "grant_jobs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "order_id" text NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "run_after" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "grant_jobs_order_kind_uq" UNIQUE ("order_id", "kind")
);

CREATE INDEX IF NOT EXISTS "grant_jobs_pending_idx"
  ON "grant_jobs" ("status", "run_after");

CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "from_currency" text NOT NULL,
  "to_currency" text NOT NULL,
  "rate" numeric(20, 8) NOT NULL,
  "spread" numeric(8, 6) NOT NULL DEFAULT 0,
  "effective_from" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exchange_rates_rate_positive" CHECK ("rate" > 0),
  CONSTRAINT "exchange_rates_spread_range" CHECK ("spread" >= 0 AND "spread" < 1)
);

CREATE INDEX IF NOT EXISTS "exchange_rates_pair_idx"
  ON "exchange_rates" ("from_currency", "to_currency", "effective_from" DESC);
