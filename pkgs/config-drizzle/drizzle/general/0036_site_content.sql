-- Editable landing content: one JSON document per page and locale. The site
-- keeps its defaults in its own translations, so only edited fields are stored
-- here; `draft` feeds the panel and the preview, `published` feeds the page.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "site_content" (
  "page" text NOT NULL,
  "locale" text NOT NULL,
  "draft" jsonb,
  "published" jsonb,
  "version" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" text,
  PRIMARY KEY ("page", "locale")
);

-- Permissions are created from the code catalog on boot; insert them here only
-- so the admin roles can be granted below.
INSERT INTO "permissions" ("name")
SELECT name
FROM (VALUES ('content.read'), ('content.update'), ('content.publish')) AS new_permissions(name)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "permissions"."name" = new_permissions.name);

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT roles."id", p."id"
FROM "roles"
JOIN "permissions" p ON p."name" IN ('content.read', 'content.update', 'content.publish')
WHERE roles."is_admin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = roles."id" AND rp."permission_id" = p."id"
  );
