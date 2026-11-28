-- Login history for account security: one row per successful session creation.
-- `new_device` is computed against the previous rows of the same account and
-- drives the panel badge and the future Telegram/e-mail alert.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "auth_login_events" (
  "id" bigserial PRIMARY KEY,
  "nickname" text NOT NULL,
  "ip" text NOT NULL,
  "browser" text NOT NULL,
  "os" text NOT NULL,
  "platform" text NOT NULL,
  "client" text NOT NULL,
  "device_key" text NOT NULL,
  "new_device" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "auth_login_events_nickname_created_idx"
  ON "auth_login_events" ("nickname", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "auth_login_events_device_idx"
  ON "auth_login_events" ("nickname", "device_key");
