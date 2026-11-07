-- Private panel: launcher releases (list + download) are visible only with
-- this permission. It is assigned to the highest role (admin, id 3); other
-- roles can be granted it later through the regular role-permission routes.
--
-- Idempotent on purpose: it runs once per environment (dev, prod) and is safe
-- to re-run.

INSERT INTO "permissions" ("name")
VALUES ('releases.read')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT 3, "id" FROM "permissions" WHERE "name" = 'releases.read'
ON CONFLICT DO NOTHING;
