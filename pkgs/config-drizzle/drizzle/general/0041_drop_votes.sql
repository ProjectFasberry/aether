-- Voting was removed: no callbacks, no rewards, no votes leaderboard.
-- Idempotent: safe to re-run after a partial deploy.

DROP TABLE IF EXISTS "voted_users";
DROP TABLE IF EXISTS "vote_sites";

DELETE FROM "events" WHERE "origin" = 'vote-for-server';
