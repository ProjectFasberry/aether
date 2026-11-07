-- The panel edits server availability and runtime fields. Permissions are
-- lowercase by convention (`servers.read`); roles that can read servers get
-- the update permission too.

-- Clean up an earlier uppercase variant if it was applied by hand.
DELETE FROM "role_permissions"
WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "name" = 'SERVERS.UPDATE');
DELETE FROM "permissions" WHERE "name" = 'SERVERS.UPDATE';

INSERT INTO "permissions" ("name")
SELECT 'servers.update'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'servers.update');

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT rp."role_id", upd."id"
FROM "role_permissions" rp
JOIN "permissions" read ON read."id" = rp."permission_id" AND read."name" = 'servers.read'
JOIN "permissions" upd ON upd."name" = 'servers.update'
WHERE NOT EXISTS (
  SELECT 1 FROM "role_permissions" x
  WHERE x."role_id" = rp."role_id" AND x."permission_id" = upd."id"
);
