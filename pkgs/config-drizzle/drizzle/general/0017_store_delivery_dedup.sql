-- Per-child pricing, delivery effect snapshots and deduplication.
--
-- A multi-item order can now skip a duplicate LuckPerms grant without
-- cancelling the other items. The skipped child keeps its snapshot so the
-- order page can explain why it was not delivered and a delivery-time race can
-- refund exactly that line.

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "line" integer,
  ADD COLUMN IF NOT EXISTS "price" numeric(14, 2),
  ADD COLUMN IF NOT EXISTS "currency" text,
  ADD COLUMN IF NOT EXISTS "effect" jsonb;

CREATE INDEX IF NOT EXISTS "payments_game_childs_dedup_idx"
  ON "payments_game_childs" ("order_id", "store_item_id", "recipient");
