-- Versioned resource packs uploaded through the panel.
--
-- ItemsAdder generates `output/generated.zip` locally; the panel uploads that
-- archive instead, hashes it and makes one row current. The current row is
-- copied to the canonical key (`resourcepack/resourcepacks/generated.zip`) and
-- written into the launcher manifest, so a pack never has to be uploaded by
-- hand to the volume again.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "resource_packs" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "sha1" text NOT NULL,
  "sha256" text NOT NULL,
  "size" bigint NOT NULL,
  -- Immutable object holding this exact archive: resourcepack/packs/<sha256>.zip
  "object_key" text NOT NULL,
  -- Client versions the pack is published for, e.g. ["1.20.1","1.20.4"].
  "minecraft" jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- pack.mcmeta pack_format, kept for the upload warning.
  "pack_format" integer,
  "notes" text,
  "uploaded_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "is_current" boolean NOT NULL DEFAULT false
);

-- The same archive must not be stored twice; uploading it again returns
-- conflict instead of a duplicate version.
CREATE UNIQUE INDEX IF NOT EXISTS "resource_packs_sha256_key" ON "resource_packs" ("sha256");

-- Exactly one published version at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "resource_packs_current_key" ON "resource_packs" ("is_current") WHERE "is_current";

-- Permissions are created from the code catalog on boot; insert them here only
-- so the admin roles can be granted below.
INSERT INTO "permissions" ("name")
SELECT name
FROM (VALUES ('resourcepack.read'), ('resourcepack.publish')) AS new_permissions(name)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "permissions"."name" = new_permissions.name);

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT roles."id", p."id"
FROM "roles"
JOIN "permissions" p ON p."name" IN ('resourcepack.read', 'resourcepack.publish')
WHERE roles."is_admin" = true
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = roles."id" AND rp."permission_id" = p."id"
  );
