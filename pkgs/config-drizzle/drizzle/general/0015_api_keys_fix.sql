-- API keys admin page: description/duration columns and the missing
-- permissions. The legacy table only had id/key/created_at/nickname, while the
-- route already reads and writes description/duration.

ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "duration" integer;

INSERT INTO "permissions" ("name")
VALUES ('api.keys.list'), ('api.keys.control')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT 3, "id" FROM "permissions" WHERE "name" IN ('api.keys.list', 'api.keys.control')
ON CONFLICT DO NOTHING;
