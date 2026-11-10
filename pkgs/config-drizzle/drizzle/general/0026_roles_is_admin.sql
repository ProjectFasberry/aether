-- Staff flag for roles. The ban bypass used to compare `players.role_id = 3`,
-- which breaks as soon as the role ids change.
--
-- The app probes for this column on boot and falls back to role id 3 until the
-- migration is applied, so applying it before or after a deploy is safe.
-- Idempotent: safe to re-run.

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;

UPDATE "roles" SET "is_admin" = true WHERE "id" = 3 AND "is_admin" = false;
