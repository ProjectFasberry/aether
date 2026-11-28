-- Localized server names.
--
-- The catalog key (`origin`) stays a lowercase slug; the display name differs
-- by locale. `fullname` is the Russian name kept for compatibility, the new
-- `fullname_en` is the English one. Clients fall back to `fullname` when it is
-- empty, so existing rows keep working before a name is translated.

ALTER TABLE "servers"
  ADD COLUMN IF NOT EXISTS "fullname_en" text NOT NULL DEFAULT '';

UPDATE "servers"
SET "fullname_en" = CASE "origin"
  WHEN 'bisquite' THEN 'Bisquite'
  WHEN 'lobby' THEN 'Lobby'
  WHEN 'muffin' THEN 'Muffin'
  ELSE initcap("origin")
END
WHERE btrim("fullname_en") = '';

-- Presence events used to store the Velocity display name ("Lobby", "Bisquite"),
-- while the catalog and playtime use the lowercase origin. One server must not
-- have two keys: normalize the history and keep new writes canonical.
UPDATE "activity_users"
SET "server" = lower("server")
WHERE "server" IS NOT NULL AND "server" <> lower("server");
