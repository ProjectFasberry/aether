-- The panel used `servers.read` to show build metrics; they now have their own
-- `metrics.read` permission. Grant it to the staff roles so the page does not
-- disappear for them. Depends on `0026_roles_is_admin.sql` for the column.
--
-- Idempotent: safe to re-run.

INSERT INTO "permissions" ("name")
SELECT 'metrics.read'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'metrics.read');

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT roles."id", p."id"
FROM "roles"
JOIN "permissions" p ON p."name" = 'metrics.read'
WHERE roles."is_admin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = roles."id" AND rp."permission_id" = p."id"
  );
