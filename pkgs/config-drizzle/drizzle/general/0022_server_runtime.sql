-- Per-server client runtime.
--
-- A server declares which Minecraft client (version, loader, Java major) the
-- launcher must install. The backend jar version is unrelated: a Purpur 1.20.4
-- backend can serve a 1.19 client through ViaVersion. Defaults keep the current
-- 1.20.4 / Fabric stack for every existing row, then the seed below marks lobby
-- as the network default.

ALTER TABLE "servers"
  ADD COLUMN IF NOT EXISTS "client_version" text NOT NULL DEFAULT '1.20.4',
  ADD COLUMN IF NOT EXISTS "loader" text NOT NULL DEFAULT 'fabric',
  ADD COLUMN IF NOT EXISTS "loader_version" text,
  ADD COLUMN IF NOT EXISTS "java_major" integer NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "resource_pack" text,
  ADD COLUMN IF NOT EXISTS "client_mod" text NOT NULL DEFAULT 'required';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servers_client_mod_check') THEN
    ALTER TABLE "servers"
      ADD CONSTRAINT "servers_client_mod_check" CHECK ("client_mod" IN ('required', 'optional'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servers_java_major_check') THEN
    ALTER TABLE "servers"
      ADD CONSTRAINT "servers_java_major_check" CHECK ("java_major" BETWEEN 8 AND 99);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'servers_loader_check') THEN
    ALTER TABLE "servers"
      ADD CONSTRAINT "servers_loader_check"
      CHECK ("loader" IN ('fabric', 'quilt', 'neoforge', 'forge', 'vanilla'));
  END IF;
END $$;

-- Seed the current stack so behavior does not change before the launcher
-- starts reading the runtime descriptor.
UPDATE "servers"
SET
  "client_version" = '1.20.4',
  "loader" = 'fabric',
  "loader_version" = '0.16.14',
  "java_major" = 21
WHERE "origin" IN ('lobby', 'bisquite');

-- Lobby is the fallback for "press Play right after login".
UPDATE "servers" SET "is_default" = ("origin" = 'lobby');

-- Exactly one network default. A second row flipped to true fails loudly.
CREATE UNIQUE INDEX IF NOT EXISTS "servers_single_default" ON "servers" ((true)) WHERE "is_default";
