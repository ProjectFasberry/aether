-- The catalog is keyed by origin: it becomes the content bundle name
-- (`server:<origin>`) and the launcher's mods directory, so two rows must not
-- share it. Duplicates would make the launcher install one server's content for
-- another.
--
-- Existing rows predate the panel's create form; normalise them before the index
-- so a case difference cannot make the index creation fail.

UPDATE "servers"
SET "origin" = lower(trim("origin"))
WHERE "origin" <> lower(trim("origin"));

CREATE UNIQUE INDEX IF NOT EXISTS "servers_origin_key" ON "servers" ("origin");
