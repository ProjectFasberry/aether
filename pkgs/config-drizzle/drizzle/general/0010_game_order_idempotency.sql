-- Game orders: the client-supplied idempotency key is looked up before a
-- retry creates (or charges) a second order.
CREATE INDEX IF NOT EXISTS "payments_game_unique_id_idx"
  ON "payments_game" ("unique_id");

CREATE INDEX IF NOT EXISTS "payments_game_childs_order_idx"
  ON "payments_game_childs" ("order_id");
