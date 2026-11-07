-- Game orders: keep the price snapshot and one row per order.
--
-- The old checkout inserted one `payments_game` row per cart item, so the same
-- unique_id could appear several times. Clean that up before adding the unique
-- index the idempotent checkout relies on.

ALTER TABLE "payments_game"
  ADD COLUMN IF NOT EXISTS "price" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill the price from the ledger for orders created before this column.
UPDATE "payments_game" AS pg
SET "price" = sub."price"
FROM (
  SELECT "order_id", jsonb_object_agg("currency", "amount") AS "price"
  FROM (
    SELECT "order_id", "currency", SUM(-"delta") AS "amount"
    FROM "ledger_entries"
    WHERE "reason" LIKE 'store.purchase:%'
      AND "order_id" IS NOT NULL
    GROUP BY "order_id", "currency"
  ) AS grouped
  GROUP BY "order_id"
) AS sub
WHERE pg."unique_id" = sub."order_id"
  AND pg."price" = '{}'::jsonb;

DELETE FROM "payments_game" AS a
USING "payments_game" AS b
WHERE a."unique_id" = b."unique_id"
  AND a."id" > b."id";

CREATE UNIQUE INDEX IF NOT EXISTS "payments_game_unique_id_uq"
  ON "payments_game" ("unique_id");

CREATE INDEX IF NOT EXISTS "payments_game_created_idx"
  ON "payments_game" ("created_at" DESC, "id" DESC);
