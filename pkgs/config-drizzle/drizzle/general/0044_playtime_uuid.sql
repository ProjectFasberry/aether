-- Playtime is keyed by the account UUID, not the nickname: a rename must keep
-- the history, and every other plugin already stores the offline UUID that the
-- account gets at registration.
--
-- One-time migration. The copy needs a nickname -> uuid map that covers CMI
-- players who never registered on the site; the deploy runbook fills
-- `playtime_uuid_map` from the game databases before this file runs.
--
-- 1. `playtime_uuid_map` is populated from `players` (authoritative) and, for
--    legacy rows, from CMI `player_uuid` / the offline UUID of the nickname.
-- 2. The old per-nickname rows are summed per (uuid, server).
-- 3. `playtime_reports.uuid` becomes NOT NULL; the reporter always sends it.

CREATE TABLE IF NOT EXISTS "playtime_uuid_map" (
  "lower_nickname" text PRIMARY KEY,
  "uuid" text NOT NULL
);

INSERT INTO "playtime_uuid_map" ("lower_nickname", "uuid")
SELECT lower("nickname"), "uuid" FROM "players"
ON CONFLICT ("lower_nickname") DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "player_playtime" pp
    LEFT JOIN "playtime_uuid_map" m ON m."lower_nickname" = pp."lower_nickname"
    WHERE m."uuid" IS NULL
  ) THEN
    RAISE EXCEPTION 'playtime_uuid_map is missing nicknames; import them from CMI first';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "player_playtime_uuid" (
  "uuid" text NOT NULL,
  "nickname" text NOT NULL,
  "lower_nickname" text NOT NULL,
  "server" text NOT NULL,
  "seconds" bigint NOT NULL DEFAULT 0 CHECK ("seconds" >= 0),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("uuid", "server")
);

INSERT INTO "player_playtime_uuid" ("uuid", "nickname", "lower_nickname", "server", "seconds")
SELECT
  m."uuid",
  max(pp."nickname"),
  max(pp."lower_nickname"),
  pp."server",
  sum(pp."seconds")
FROM "player_playtime" pp
JOIN "playtime_uuid_map" m ON m."lower_nickname" = pp."lower_nickname"
GROUP BY m."uuid", pp."server";

CREATE INDEX IF NOT EXISTS "player_playtime_uuid_lower_idx"
  ON "player_playtime_uuid" ("lower_nickname");

CREATE INDEX IF NOT EXISTS "player_playtime_uuid_seconds_idx"
  ON "player_playtime_uuid" ("seconds" DESC);

DROP TABLE "player_playtime";
ALTER TABLE "player_playtime_uuid" RENAME TO "player_playtime";

DROP TABLE "playtime_uuid_map";

ALTER TABLE "playtime_reports" ALTER COLUMN "uuid" SET NOT NULL;
