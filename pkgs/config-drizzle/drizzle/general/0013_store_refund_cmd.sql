-- Generic refund instructions for store items.
--
-- `refund_cmd` is a command template ({recipient}, {value}, {initiator}) run
-- when an already delivered order is refunded. The order snapshots it together
-- with type/value so a later item edit does not change a historical refund.
ALTER TABLE "store_items"
  ADD COLUMN IF NOT EXISTS "refund_cmd" text;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "command" text;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "refund_cmd" text;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "type" text;

ALTER TABLE "payments_game_childs"
  ADD COLUMN IF NOT EXISTS "value" text;
