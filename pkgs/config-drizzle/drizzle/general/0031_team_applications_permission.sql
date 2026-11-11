-- Reviewing team applications is staff work. The read permission controls the
-- panel page, the update one moves the status. Depends on 0026 for `is_admin`.
--
-- Idempotent: safe to re-run.

INSERT INTO "permissions" ("name")
SELECT 'team.applications.read'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'team.applications.read');

INSERT INTO "permissions" ("name")
SELECT 'team.applications.update'
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "name" = 'team.applications.update');

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT roles."id", p."id"
FROM "roles"
JOIN "permissions" p ON p."name" IN ('team.applications.read', 'team.applications.update')
WHERE roles."is_admin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = roles."id" AND rp."permission_id" = p."id"
  );
