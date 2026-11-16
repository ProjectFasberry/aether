-- Invites and referrals share one link table. The token is stored as a sha256
-- hash, is single-use and expires; the raw token only exists in the URL handed
-- to the player.
--
-- Invite: an admin reserves the nickname, the player only sets a password.
-- Referral: a player generates the link; accepting it creates the account and
-- records the referral row (the old `?referrer=<nickname>` links are gone).
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "player_links" (
  "id" bigserial PRIMARY KEY,
  "token_hash" text NOT NULL UNIQUE,
  "kind" text NOT NULL CHECK ("kind" IN ('invite', 'referral')),
  "nickname" text,
  "referrer" text,
  "findout" text NOT NULL,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "used_by" text,
  "ip" inet
);

CREATE UNIQUE INDEX IF NOT EXISTS "player_links_invite_uq"
  ON "player_links" (lower("nickname"))
  WHERE "kind" = 'invite' AND "used_at" IS NULL;

CREATE INDEX IF NOT EXISTS "player_links_referrer_idx"
  ON "player_links" ("referrer", "created_at");

ALTER TABLE "referrals"
  ADD COLUMN IF NOT EXISTS "link_id" bigint REFERENCES "player_links" ("id") ON DELETE SET NULL;

-- The yearly referral limit is a rolling 12-month count per referrer.
CREATE INDEX IF NOT EXISTS "referrals_referrer_created_idx"
  ON "referrals" ("referrer", "created_at");
