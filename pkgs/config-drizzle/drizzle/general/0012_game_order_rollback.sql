-- Automatic rollback for a game order whose delivery never completed.
ALTER TABLE "payments_game"
  ADD COLUMN IF NOT EXISTS "failure_reason" text;
