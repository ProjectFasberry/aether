-- Per-child delivery and revocation state.
--
-- `payments_game.finished_at` is a single timestamp. A partial delivery (the
-- first item succeeded, the second failed) needs a status per child so a retry
-- skips delivered items and the panel can show what is still pending.

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "delivery_status" text NOT NULL DEFAULT 'pending';

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "delivery_attempts" integer NOT NULL DEFAULT 0;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "last_error" text;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "command_id" text;

CREATE INDEX IF NOT EXISTS "payments_game_childs_delivery_idx"
  ON "payments_game_childs" ("order_id", "delivery_status");

-- Orders finished before this migration were delivered under the old model.
UPDATE "payments_game_childs" AS c
SET "delivery_status" = 'delivered',
    "delivered_at" = pg."finished_at"
FROM "payments_game" AS pg
WHERE c."order_id" = pg."unique_id"
  AND pg."finished_at" IS NOT NULL
  AND c."delivery_status" = 'pending';
