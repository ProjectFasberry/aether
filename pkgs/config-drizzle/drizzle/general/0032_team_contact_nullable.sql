-- The applicant now picks one channel: Telegram or email. Whichever was not
-- chosen stays empty, so the old NOT NULL on `telegram` has to go.
--
-- Idempotent: safe to re-run.

ALTER TABLE "team_applications" ALTER COLUMN "telegram" DROP NOT NULL;
