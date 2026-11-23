-- Project rules are edited from the panel. Idempotent: safe to re-run.

INSERT INTO "permissions" ("name")
SELECT name
FROM (VALUES ('rules.read'), ('rules.update')) AS new_permissions(name)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "permissions"."name" = new_permissions.name);

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT roles."id", p."id"
FROM "roles"
JOIN "permissions" p ON p."name" IN ('rules.read', 'rules.update')
WHERE roles."is_admin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = roles."id" AND rp."permission_id" = p."id"
  );
