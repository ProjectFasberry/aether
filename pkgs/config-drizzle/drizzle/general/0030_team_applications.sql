-- Applications to join the Fasberry team. One row per submit; the panel lists
-- them and moves the status through review.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "team_applications" (
  "id" serial PRIMARY KEY,
  "nickname" text NOT NULL,
  "uuid" text,
  "roles" text[] NOT NULL,
  "about" text NOT NULL,
  "telegram" text NOT NULL,
  "email" text,
  "portfolio" text,
  "status" text NOT NULL DEFAULT 'new',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "team_applications" ADD CONSTRAINT "team_applications_status_check"
    CHECK ("status" IN ('new', 'reviewed', 'invited', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "team_applications_created_at_idx"
  ON "team_applications" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "team_applications_status_idx"
  ON "team_applications" ("status");
CREATE INDEX IF NOT EXISTS "team_applications_nickname_idx"
  ON "team_applications" ("nickname");
