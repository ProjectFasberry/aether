-- Presence history for the player graphs. `server` comes from the proxy payload,
-- which the subscriber used to drop; `uuid` keeps history stable across renames
-- and `session` is reserved for the connection id the proxy will publish.
--
-- Idempotent: safe to re-run.

ALTER TABLE "activity_users" ADD COLUMN IF NOT EXISTS "server" text;
ALTER TABLE "activity_users" ADD COLUMN IF NOT EXISTS "uuid" text;
ALTER TABLE "activity_users" ADD COLUMN IF NOT EXISTS "session" text;

CREATE INDEX IF NOT EXISTS "activity_users_event_idx"
  ON "activity_users" ("event" DESC);
CREATE INDEX IF NOT EXISTS "activity_users_nickname_event_idx"
  ON "activity_users" ("nickname", "event" DESC);
CREATE INDEX IF NOT EXISTS "activity_users_server_event_idx"
  ON "activity_users" ("server", "event" DESC);
