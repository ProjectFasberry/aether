-- The admin role can create/update/delete store items but was never granted
-- the read permission, so the private store list is inaccessible. Grant it to
-- the owner only, as requested.

INSERT INTO "permissions" ("name")
VALUES ('store.item.read')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "players_permissions" ("nickname", "permission_id")
SELECT 'distribate', "id" FROM "permissions" WHERE "name" = 'store.item.read'
ON CONFLICT ("nickname", "permission_id") DO NOTHING;
