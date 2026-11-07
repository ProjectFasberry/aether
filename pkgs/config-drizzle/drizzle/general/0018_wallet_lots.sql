-- Top-up lots for FIFO spending and partial refunds.
--
-- Existing balances predate lot tracking. They are backfilled as one
-- non-refundable legacy lot per wallet so the sum of lot remainders matches
-- `wallets.balance` without making old money refundable.

CREATE TABLE IF NOT EXISTS "wallet_lots" (
  "id" bigserial PRIMARY KEY,
  "nickname" text NOT NULL,
  "currency" text NOT NULL,
  "kind" text NOT NULL,
  "refundable" boolean NOT NULL DEFAULT false,
  "amount" bigint NOT NULL,
  "remaining" bigint NOT NULL,
  "source_order_id" text,
  "source_ledger_id" bigint REFERENCES "ledger_entries" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wallet_lots_spend_idx"
  ON "wallet_lots" ("nickname", "currency", "remaining", "created_at", "id");

CREATE INDEX IF NOT EXISTS "wallet_lots_source_idx"
  ON "wallet_lots" ("source_order_id")
  WHERE "source_order_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "lot_allocations" (
  "id" bigserial PRIMARY KEY,
  "lot_id" bigint NOT NULL REFERENCES "wallet_lots" ("id") ON DELETE CASCADE,
  "ledger_entry_id" bigint NOT NULL REFERENCES "ledger_entries" ("id") ON DELETE CASCADE,
  "amount" bigint NOT NULL,
  "restored_amount" bigint NOT NULL DEFAULT 0,
  "direction" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lot_allocations_ledger_idx"
  ON "lot_allocations" ("ledger_entry_id");

CREATE INDEX IF NOT EXISTS "lot_allocations_lot_idx"
  ON "lot_allocations" ("lot_id");

INSERT INTO "wallet_lots" ("nickname", "currency", "kind", "refundable", "amount", "remaining", "source_order_id")
SELECT
  "w"."nickname",
  "w"."currency",
  'legacy',
  false,
  "w"."balance",
  "w"."balance",
  'legacy:' || "w"."nickname" || ':' || "w"."currency"
FROM "wallets" AS "w"
WHERE "w"."balance" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "wallet_lots" AS "l"
    WHERE "l"."nickname" = "w"."nickname"
      AND "l"."currency" = "w"."currency"
  );
