-- Admin activity history: structured metadata, severity/source and the indexes
-- the panel needs for cursor pagination and filters.
--
-- The table is append-only; retention is handled by a cron job that removes
-- rows older than 180 days in batches (see shared/cron/jobs.ts).

ALTER TABLE "admin_activity_log"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "admin_activity_log"
  ADD COLUMN IF NOT EXISTS "severity" text NOT NULL DEFAULT 'info';

ALTER TABLE "admin_activity_log"
  ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'panel';

CREATE INDEX IF NOT EXISTS "admin_activity_log_created_id_idx"
  ON "admin_activity_log" ("created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "admin_activity_log_initiator_idx"
  ON "admin_activity_log" ("initiator", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "admin_activity_log_event_idx"
  ON "admin_activity_log" ("event", "created_at" DESC);
