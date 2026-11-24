-- One vote per player per period, and enough state to retry a failed reward.
-- The old endpoint relied on a nickname unique constraint that was never
-- created. Idempotent: safe to re-run.

ALTER TABLE "voted_users"
  ADD COLUMN IF NOT EXISTS "period" text;

UPDATE "voted_users"
SET "period" = to_char("created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE "period" IS NULL;

ALTER TABLE "voted_users"
  ALTER COLUMN "period" SET NOT NULL;

DROP INDEX IF EXISTS "voted_users_nickname_uniq";

-- Keep the oldest row per player and period before adding the unique index.
DELETE FROM "voted_users" a
USING "voted_users" b
WHERE a."id" > b."id"
  AND lower(a."nickname") = lower(b."nickname")
  AND a."period" = b."period";

CREATE UNIQUE INDEX IF NOT EXISTS "voted_users_nickname_period_uniq"
  ON "voted_users" (lower("nickname"), "period");
