-- One row per banner and nickname. The panel inserted a row on every request,
-- so the table grew from any traffic. Mirrors news_views, which already dedupes
-- per initiator. A unique index keeps the insert idempotent via ON CONFLICT.
--
-- Idempotent: safe to re-run.

DELETE FROM "banners_views" a
USING "banners_views" b
WHERE a."id" > b."id"
  AND a."banner_id" = b."banner_id"
  AND a."nickname" = b."nickname";

CREATE UNIQUE INDEX IF NOT EXISTS "banners_views_banner_id_nickname_uniq"
  ON "banners_views" ("banner_id", "nickname");
