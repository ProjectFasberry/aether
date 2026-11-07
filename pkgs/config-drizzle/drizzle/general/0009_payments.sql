-- Payments (MN-151, MN-152).
--
-- `orders` is the provider-agnostic invoice; a provider id is stored once the
-- invoice is created. `payment_events` keeps every callback for audit and makes
-- a repeated provider event harmless.
--
-- The legacy `payments` table is not used anymore; it stays read-only.

CREATE TABLE IF NOT EXISTS "orders" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "order_id" text NOT NULL,
  "nickname" text NOT NULL,
  "provider" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL,
  "belkoin" bigint NOT NULL DEFAULT 0,
  "rate" numeric(20, 8),
  "spread" numeric(8, 6),
  "provider_payment_id" text,
  "pay_url" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "paid_at" timestamptz,
  "refunded_at" timestamptz,
  CONSTRAINT "orders_status_check"
    CHECK ("status" IN ('pending', 'succeeded', 'failed', 'expired', 'refunded')),
  CONSTRAINT "orders_amount_positive" CHECK ("amount_minor" > 0),
  CONSTRAINT "orders_order_id_uq" UNIQUE ("order_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "orders_provider_payment_uq"
  ON "orders" ("provider", "provider_payment_id")
  WHERE "provider_payment_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "orders_nickname_created_idx"
  ON "orders" ("nickname", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "orders_pending_idx"
  ON "orders" ("status", "expires_at");

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "provider" text NOT NULL,
  "provider_event_id" text,
  "order_id" text,
  "signature_valid" boolean NOT NULL DEFAULT false,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "error" text,
  "processed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_provider_event_uq"
  ON "payment_events" ("provider", "provider_event_id");

CREATE INDEX IF NOT EXISTS "payment_events_order_idx"
  ON "payment_events" ("order_id");
