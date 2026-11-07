-- Private panel: economy section (MN-156).
--
-- `economy.read` opens the wallet and the ledger, `economy.write` allows
-- adjustments, refunds and the balance migration. Both go to the admin role;
-- other roles can be granted them later through the regular role routes.
--
-- Also marks refunded game orders so the ledger and the order list agree.

INSERT INTO "permissions" ("name")
VALUES ('economy.read'), ('economy.write')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT 3, "id" FROM "permissions" WHERE "name" IN ('economy.read', 'economy.write')
ON CONFLICT DO NOTHING;

ALTER TABLE "payments_game"
  ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz;
