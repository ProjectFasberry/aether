-- LuckPerms group behind each panel role, so a role change also changes the
-- in-game group. `changeRoleUsers` reads this column and sends
-- `lp user <nickname> parent set <group>` through the NATS command bus.
--
-- Idempotent: safe to re-run; existing non-null values are kept.

ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "luckperms_group" varchar(50);

UPDATE "roles" SET "luckperms_group" = 'default' WHERE "name" = 'player' AND "luckperms_group" IS NULL;
UPDATE "roles" SET "luckperms_group" = 'moder' WHERE "name" = 'moderator' AND "luckperms_group" IS NULL;
UPDATE "roles" SET "luckperms_group" = 'arkhont' WHERE "name" = 'admin' AND "luckperms_group" IS NULL;
