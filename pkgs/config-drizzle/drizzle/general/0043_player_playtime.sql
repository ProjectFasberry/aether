-- Network playtime: one row per player and backend, fed by the NatsIntegration
-- playtime module. The proxy is not involved: every backend counts its own
-- active minutes (AFK excluded) and reports increments.
--
-- `playtime_reports` is the idempotency ledger: a report id is accepted once,
-- and only then its seconds are added to `player_playtime`. Retries after a
-- reconnect therefore never double-count.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "player_playtime" (
  "lower_nickname" text NOT NULL,
  "nickname" text NOT NULL,
  "server" text NOT NULL,
  "seconds" bigint NOT NULL DEFAULT 0 CHECK ("seconds" >= 0),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("lower_nickname", "server")
);

CREATE INDEX IF NOT EXISTS "player_playtime_seconds_idx"
  ON "player_playtime" ("seconds" DESC);

CREATE TABLE IF NOT EXISTS "playtime_reports" (
  "id" uuid PRIMARY KEY,
  "session_id" uuid NOT NULL,
  "uuid" text,
  "lower_nickname" text NOT NULL,
  "nickname" text NOT NULL,
  "server" text NOT NULL,
  "seconds" integer NOT NULL CHECK ("seconds" > 0),
  "received_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "playtime_reports_received_idx"
  ON "playtime_reports" ("received_at" DESC);
